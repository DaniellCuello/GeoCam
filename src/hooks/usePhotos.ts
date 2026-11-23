import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { requestSync } from '@/hooks/useSync';
import { deletePhotoFile, persistPhoto } from '@/services/photoFiles';
import * as photoRepository from '../../db/repositories/photos';
import type { AlbumFilter, PhotoFilters } from '../../db/repositories/photos';
import type { Photo } from '../../db/schema';
import type { Coords, GeoSource } from '@/types/geo';

export type AddPhotoInput = {
  source: GeoSource;
  uri: string;
  coords: Coords | null;
  albumId?: number | null;
};

export type UsePhotosFilters = {
  search?: string;
  albumId?: AlbumFilter;
  onlyFavorites?: boolean;
};

export function usePhotoActions() {
  const { user } = useAuth();

  const addPhoto = useCallback(
    async (input: AddPhotoInput): Promise<Photo> => {
      const persistentUri = await persistPhoto(input.uri);

      try {
        const created = await photoRepository.create({
          uri: persistentUri,
          source: input.source,
          latitude: input.coords?.latitude ?? null,
          longitude: input.coords?.longitude ?? null,
          accuracy: input.coords?.accuracy ?? null,
          albumId: input.albumId ?? null,
          ownerId: user?.id ?? null,
        });

        // Semana 9: Dispara la sincronización automática tras cada cambio local
        requestSync();

        return created;
      } catch (cause) {
        try {
          deletePhotoFile(persistentUri);
        } catch (cleanupCause) {
          const originalMessage =
            cause instanceof Error ? cause.message : 'No se pudo guardar la fotografía en SQLite.';
          const cleanupMessage =
            cleanupCause instanceof Error ? cleanupCause.message : 'No se pudo limpiar el archivo.';
          throw new Error(`${originalMessage} Además, falló la limpieza del archivo: ${cleanupMessage}`);
        }

        throw cause;
      }
    },
    [user]
  );

  const removePhoto = useCallback(
    async (id: number): Promise<void> => {
      // C1: Borrado lógico sincronizado. Se marca en SQLite y se pide sincronizar para
      // propagar la eliminación a Supabase y al resto de dispositivos del usuario.
      await photoRepository.softDelete(id);
      requestSync();
    },
    []
  );

  const clearAll = useCallback(async (): Promise<void> => {
    const list = await photoRepository.listPending(user?.id ?? null);
    for (const p of list) {
      await photoRepository.softDelete(p.id);
    }
    requestSync();
  }, [user]);

  const updatePhoto = useCallback(
    async (id: number, values: Partial<Pick<Photo, 'note' | 'favorite' | 'albumId' | 'aiDescription'>>) => {
      const updated = await photoRepository.update(id, values);
      requestSync();
      return updated;
    },
    []
  );

  const setAiDescription = useCallback(
    async (id: number, aiDescription: string | null) => {
      const updated = await photoRepository.setDescription(id, aiDescription);
      requestSync();
      return updated;
    },
    []
  );

  return { addPhoto, removePhoto, clearAll, updatePhoto, setAiDescription };
}

export function usePhotos(filters: UsePhotosFilters = {}) {
  const { user } = useAuth();
  const search = filters.search ?? '';
  const albumId = filters.albumId === undefined ? 'all' : filters.albumId;
  const onlyFavorites = filters.onlyFavorites ?? false;
  const ownerId = user?.id ?? null;

  const queryFilters: PhotoFilters = {
    search,
    albumId,
    onlyFavorites,
    ownerId,
  };

  const photoQuery = useLiveQuery(photoRepository.listQuery(queryFilters), [
    search,
    albumId,
    onlyFavorites,
    ownerId,
  ]);
  const locatedQuery = useLiveQuery(photoRepository.withLocationQuery(queryFilters), [
    search,
    albumId,
    onlyFavorites,
    ownerId,
  ]);
  const actions = usePhotoActions();

  return {
    photos: photoQuery.data ?? [],
    photosWithLocation: locatedQuery.data ?? [],
    queryError: photoQuery.error ?? locatedQuery.error,
    ...actions,
  };
}

export function usePhoto(id: number) {
  const query = useLiveQuery(photoRepository.byIdQuery(id), [id]);
  return { photo: query.data?.[0] ?? null, error: query.error };
}
