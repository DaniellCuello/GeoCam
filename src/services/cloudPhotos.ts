import { photosRepo } from '../../db/repositories/photos';
import type { Photo } from '../../db/schema';
import { supabase } from '@/lib/supabase';

export const BUCKET = 'geocam';

export interface CloudPhoto {
  id: number | string;
  client_id: string;
  user_id: string;
  storage_path: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  favorite: boolean;
  source: 'camera' | 'gallery';
  taken_at: string;
  updated_at: string;
  created_at: string;
  signedUrl?: string;
}

/**
 * Genera una URL firmada válida por 1 hora para ver fotos de un bucket privado en Supabase.
 */
export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) {
    throw error;
  }
  return data.signedUrl;
}

/**
 * T5 & C2: Sube una foto a Supabase Storage y registra su fila en la tabla remota.
 * Si la inserción en la base de datos falla, elimina el archivo del bucket para evitar huérfanos.
 * Utiliza client_id con upsert para evitar duplicados al repetir la sincronización.
 */
export async function uploadPhoto(photo: Photo, userId: string): Promise<string> {
  if (!photo.clientId) {
    throw new Error('La foto no tiene clientId local: ejecuta ensureSyncFields()');
  }

  // 1. Archivo local -> ArrayBuffer (evita el bug de 0 bytes de FormData en React Native)
  const arrayBuffer = await fetch(photo.uri).then((res) => res.arrayBuffer());

  // 2. Subir a la carpeta del usuario: <userId>/<clientId>.jpg (exigido por la política RLS)
  const path = `${userId}/${photo.clientId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  // 3. Fila remota con los metadatos (upsert con conflicto en client_id para C2)
  const { error: insertError } = await supabase.from('photos').upsert(
    {
      client_id: photo.clientId,
      user_id: userId,
      storage_path: path,
      latitude: photo.latitude,
      longitude: photo.longitude,
      note: photo.note,
      favorite: photo.favorite,
      source: photo.source,
      taken_at: photo.createdAt.toISOString(),
      updated_at: (photo.updatedAt ?? photo.createdAt).toISOString(),
    },
    { onConflict: 'client_id' }
  );

  // C2: Si falla la inserción en la tabla, borrar de Storage para no dejar huérfanos
  if (insertError) {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (cleanupErr) {
      console.warn('No se pudo limpiar el archivo huérfano:', cleanupErr);
    }
    throw insertError;
  }

  // 4. Marcar la foto local como sincronizada sin alterar su fecha updatedAt
  await photosRepo.markSynced(photo.id, path);

  return path;
}

/**
 * C1: Sube todas las fotos pendientes una por una reportando el progreso ("X de Y").
 * Si alguna falla, las demás continúan y se retorna el resumen.
 */
export async function syncPendingPhotos(
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  await photosRepo.ensureSyncFields(userId);

  const pending = await photosRepo.listUnsynced(userId);
  const total = pending.length;
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const photo = pending[i];
    onProgress?.(i + 1, total);

    try {
      await uploadPhoto(photo, userId);
      synced++;
    } catch (error) {
      console.error(`Error sincronizando foto ${photo.id}:`, error);
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * C3: Borrado coherente. Al eliminar una foto sincronizada, se borran también
 * su fila remota en PostgreSQL y su archivo del bucket de Supabase Storage.
 */
export async function deleteCloudPhoto(photo: Photo, userId: string): Promise<void> {
  if (photo.clientId) {
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('client_id', photo.clientId);

    if (dbError) {
      throw dbError;
    }
  }

  if (photo.remotePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([photo.remotePath]);

    if (storageError) {
      console.warn('Advertencia al borrar de Storage:', storageError);
    }
  }
}

/**
 * C4: Obtiene las fotos del usuario en Supabase con sus URL firmadas.
 */
export async function listCloudPhotos(userId: string): Promise<CloudPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const items = (data as CloudPhoto[]) || [];

  // Resolver las URL firmadas para mostrarlas
  const withUrls = await Promise.all(
    items.map(async (item) => {
      try {
        const url = await signedUrl(item.storage_path);
        return { ...item, signedUrl: url };
      } catch {
        return item;
      }
    })
  );

  return withUrls;
}

/**
 * C2 (Semana 9): Consulta remota paginada por cursor con búsqueda y filtrado de borrados lógicos.
 */
const CLOUD_PAGE_SIZE = 10;

export interface CloudPhotosPage {
  items: CloudPhoto[];
  nextCursor: string | null;
}

export async function listCloudPhotosPage(params: {
  userId: string;
  cursor: string | null;
  search: string;
}): Promise<CloudPhotosPage> {
  let query = supabase
    .from('photos')
    .select('*')
    .eq('user_id', params.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(CLOUD_PAGE_SIZE);

  if (params.cursor) {
    query = query.lt('created_at', params.cursor);
  }

  const term = params.search.trim();
  if (term) {
    query = query.ilike('note', `%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rawItems = (data ?? []) as CloudPhoto[];
  const withUrls = await Promise.all(
    rawItems.map(async (item) => {
      try {
        const url = await signedUrl(item.storage_path);
        return { ...item, signedUrl: url };
      } catch {
        return item;
      }
    })
  );

  return {
    items: withUrls,
    nextCursor: rawItems.length === CLOUD_PAGE_SIZE ? rawItems[rawItems.length - 1].created_at : null,
  };
}

/**
 * C4: Suscripción en tiempo real a cambios en la tabla 'photos' de Supabase.
 */
export function subscribeToUserCloudPhotos(onTableChange: () => void): () => void {
  const channel = supabase
    .channel('cloud-photos-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'photos' },
      () => {
        onTableChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


