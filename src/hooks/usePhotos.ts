import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { deleteCloudPhoto, syncPendingPhotos } from '@/services/cloudPhotos';
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
        return await photoRepository.create({
          uri: persistentUri,
          source: input.source,
          latitude: input.coords?.latitude ?? null,
          longitude: input.coords?.longitude ?? null,
          accuracy: input.coords?.accuracy ?? null,
          albumId: input.albumId ?? null,
          ownerId: user?.id ?? null,
        });
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
      // 1. Obtener datos de la foto antes de borrarla
      const existing = (await photoRepository.byIdQuery(id))[0];

      // 2. Si está sincronizada en la nube, borrarla coherentemente en Supabase (C3)
      if (existing && existing.remotePath && user?.id) {
        try {
          await deleteCloudPhoto(existing, user.id);
        } catch (cloudErr) {
          throw new Error(
            `No se pudo eliminar de la nube (verifica tu conexión): ${
              cloudErr instanceof Error ? cloudErr.message : String(cloudErr)
            }`
          );
        }
      }

      // 3. Eliminar de SQLite local
      const removed = await photoRepository.remove(id);

      if (removed) {
        deletePhotoFile(removed.uri);
      }
    },
    [user]
  );

  const clearAll = useCallback(async (): Promise<void> => {
    const removed = await photoRepository.clearAll(user?.id ?? null);
    const cleanup = await Promise.allSettled(removed.map((photo) => deletePhotoFile(photo.uri)));
    const failures = cleanup.filter((result) => result.status === 'rejected');

    if (failures.length > 0) {
      throw new Error(
        `Se borraron los registros, pero no se pudieron eliminar ${failures.length} archivo(s) de fotografía.`
      );
    }
  }, [user]);

  const updatePhoto = useCallback(
    (id: number, values: Partial<Pick<Photo, 'note' | 'favorite' | 'albumId'>>) =>
      photoRepository.update(id, values),
    []
  );

  const syncPending = useCallback(
    async (onProgress?: (current: number, total: number) => void) => {
      if (!user?.id) {
        throw new Error('Debes iniciar sesión para sincronizar fotos.');
      }
      return syncPendingPhotos(user.id, onProgress);
    },
    [user]
  );

  return { addPhoto, removePhoto, clearAll, updatePhoto, syncPending };
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
