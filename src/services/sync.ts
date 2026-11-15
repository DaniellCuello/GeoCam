// src/services/sync.ts
// Semana 9: Sincronización bidireccional offline-first entre SQLite y Supabase.
// Diseño:
// 1) BAJAR: Descarga cambios remotos a partir del cursor (server_updated_at).
// 2) SUBIR: Sube pendientes locales a la nube (idempotente por client_id).
// Manejo de conflictos: "Gana el último cambio" con preservación de notas (Reto opcional).
// Soporte de borrado lógico (C1) y tolerancia a fallos por fotografía (C5).

import { photosRepo } from '../../db/repositories/photos';
import { syncMetaRepo } from '../../db/repositories/syncMeta';
import { supabase } from '@/lib/supabase';
import { BUCKET } from './cloudPhotos';
import { deletePhotoFile, downloadPhotoFile } from './photoFiles';

export interface RemotePhoto {
  client_id: string;
  storage_path: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  favorite: boolean;
  source: 'camera' | 'gallery';
  taken_at: string;
  updated_at: string; // Reloj del cliente: decide conflictos
  server_updated_at: string; // Reloj del servidor: cursor de bajada
  deleted_at: string | null; // C1: Borrado lógico sincronizado
  user_id?: string;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  failed: number;
  finishedAt: number;
}

/**
 * Regla de resolución de conflictos pura: gana el último cambio.
 * Con fechas iguales no gana nadie porque ya están sincronizados.
 */
export function remoteWins(localUpdatedAt: Date | null, remoteUpdatedAt: string): boolean {
  return new Date(remoteUpdatedAt).getTime() > (localUpdatedAt?.getTime() ?? 0);
}

/**
 * Reto Opcional: Cuando dos teléfonos modifican la nota de una foto sin conexión,
 * en lugar de destruir la nota más antigua, fusiona ambos textos con un separador claro.
 */
export function mergeNotesOnConflict(
  localNote: string | null,
  remoteNote: string | null,
  localUpdatedAt: Date | null,
  remoteUpdatedAt: string
): string | null {
  const local = localNote?.trim() ?? '';
  const remote = remoteNote?.trim() ?? '';

  if (!local) return remote || null;
  if (!remote) return local || null;
  if (local === remote) return local;

  // Si son distintas y ambas fueron editadas sin conexión, preservamos las dos
  const isRemoteNewer = remoteWins(localUpdatedAt, remoteUpdatedAt);
  if (isRemoteNewer) {
    return `${remote}\n\n[Nota local conservada]:\n${local}`;
  }
  return `${local}\n\n[Nota remota recibida]:\n${remote}`;
}

/** Comprueba si una foto local requiere sincronización */
export function isPending(photo: { syncedAt: Date | null; updatedAt: Date | null }): boolean {
  if (!photo.syncedAt) return true;
  return (photo.updatedAt?.getTime() ?? 0) > photo.syncedAt.getTime();
}

/**
 * PASO 1 - BAJAR (PULL): Solo lo que llegó al servidor después del cursor.
 */
async function pull(userId: string): Promise<number> {
  const cursorKey = `lastPulledAt:${userId}`;
  const since = (await syncMetaRepo.get(cursorKey)) ?? '1970-01-01T00:00:00Z';

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .gt('server_updated_at', since)
    .order('server_updated_at', { ascending: true })
    .limit(200);

  if (error) {
    throw error;
  }

  let applied = 0;

  for (const remote of (data ?? []) as RemotePhoto[]) {
    const local = await photosRepo.findByClientId(remote.client_id);
    const remoteUpdatedAt = new Date(remote.updated_at);

    // C1: Si la foto fue borrada en la nube (borrado lógico)
    if (remote.deleted_at) {
      if (local && (!local.deletedAt || remoteWins(local.updatedAt, remote.updated_at))) {
        await photosRepo.applyRemote(local.id, {
          deletedAt: new Date(remote.deleted_at),
          updatedAt: remoteUpdatedAt,
          syncedAt: remoteUpdatedAt,
        });
        deletePhotoFile(local.uri);
        applied++;
      }
      await syncMetaRepo.set(cursorKey, remote.server_updated_at);
      continue;
    }

    if (!local) {
      // Foto creada en otro teléfono: descargar el archivo a documentos y guardar fila local
      try {
        const uri = await downloadPhotoFile(remote.storage_path, remote.client_id);
        await photosRepo.insertFromRemote({
          clientId: remote.client_id,
          uri,
          latitude: remote.latitude,
          longitude: remote.longitude,
          accuracy: null,
          note: remote.note,
          favorite: remote.favorite,
          source: remote.source,
          createdAt: new Date(remote.taken_at),
          updatedAt: remoteUpdatedAt,
          remotePath: remote.storage_path,
          syncedAt: remoteUpdatedAt, // Nace sincronizada en este dispositivo
          ownerId: userId,
          deletedAt: null,
        });
        applied++;
      } catch (err) {
        console.warn('[Sync Pull] Error descargando foto remota:', remote.client_id, err);
      }
    } else if (remoteWins(local.updatedAt, remote.updated_at)) {
      // La versión remota es más reciente: aplicar cambios en local
      const resolvedNote = mergeNotesOnConflict(
        local.note,
        remote.note,
        local.updatedAt,
        remote.updated_at
      );

      await photosRepo.applyRemote(local.id, {
        note: resolvedNote,
        favorite: remote.favorite,
        updatedAt: remoteUpdatedAt,
        syncedAt: remoteUpdatedAt,
        deletedAt: null,
      });
      applied++;
    }

    // Avanza el cursor fila por fila para que cualquier interrupción reanude en el punto exacto
    await syncMetaRepo.set(cursorKey, remote.server_updated_at);
  }

  return applied;
}

/**
 * PASO 2 - SUBIR (PUSH): Envía las fotos pendientes de forma idempotente.
 * C5: Si una foto particular falla (p.ej. archivo local borrado), se captura el error
 * y el ciclo continúa procesando las demás fotos.
 */
async function push(userId: string): Promise<{ pushed: number; failed: number }> {
  const pending = await photosRepo.listPending(userId);
  let pushed = 0;
  let failed = 0;

  for (const photo of pending) {
    if (!photo.clientId) continue;

    const path = photo.remotePath ?? `${userId}/${photo.clientId}.jpg`;
    const updatedAt = photo.updatedAt ?? photo.createdAt;

    try {
      // C1: Subida de borrado lógico pendiente
      if (photo.deletedAt) {
        // 1. Borrar archivo de Storage si existe
        if (photo.remotePath) {
          try {
            await supabase.storage.from(BUCKET).remove([photo.remotePath]);
          } catch (storageErr) {
            console.warn('[Sync Push] Error eliminando archivo remoto:', storageErr);
          }
        }

        // 2. Marcar deleted_at en Supabase
        const { error: deleteError } = await supabase.from('photos').upsert(
          {
            client_id: photo.clientId,
            storage_path: path,
            latitude: photo.latitude,
            longitude: photo.longitude,
            note: photo.note,
            favorite: photo.favorite,
            source: photo.source,
            taken_at: photo.createdAt.toISOString(),
            updated_at: updatedAt.toISOString(),
            deleted_at: photo.deletedAt.toISOString(),
          },
          { onConflict: 'client_id' }
        );

        if (deleteError) throw deleteError;

        await photosRepo.markSynced(photo.id, path, updatedAt);
        deletePhotoFile(photo.uri);
        pushed++;
        continue;
      }

      // 1. Subir binario a Supabase Storage (solo si no tenía remotePath registrado)
      if (!photo.remotePath) {
        const arrayBuffer = await fetch(photo.uri).then((res) => res.arrayBuffer());
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

        // Si ya existe en el bucket (un intento anterior cayó antes de guardar la fila), se tolera
        if (uploadError && !/exists/i.test(uploadError.message)) {
          throw uploadError;
        }
      }

      // 2. Upsert en la tabla photos: actualiza o crea sin duplicar
      const { error: upsertError } = await supabase.from('photos').upsert(
        {
          client_id: photo.clientId,
          storage_path: path,
          latitude: photo.latitude,
          longitude: photo.longitude,
          note: photo.note,
          favorite: photo.favorite,
          source: photo.source,
          taken_at: photo.createdAt.toISOString(),
          updated_at: updatedAt.toISOString(),
          deleted_at: null,
        },
        { onConflict: 'client_id' }
      );

      if (upsertError) throw upsertError;

      // 3. syncedAt = la versión (updatedAt) que se subió, no "ahora".
      // Si el usuario editó la foto mientras subía, syncedAt queda anterior a updatedAt y seguirá pendiente.
      await photosRepo.markSynced(photo.id, path, updatedAt);
      pushed++;
    } catch (photoErr) {
      // C5: Si falla una foto puntual, las demás continúan
      console.warn(`[Sync Push] Error al sincronizar foto ${photo.id}:`, photoErr);
      failed++;
    }
  }

  return { pushed, failed };
}

/** Ejecuta un ciclo completo de sincronización (máximo 3 rondas si hubo ediciones concurrentes) */
async function runSync(userId: string): Promise<SyncResult> {
  let pulled = 0;
  let pushed = 0;
  let failed = 0;

  for (let round = 0; round < 3; round++) {
    pulled += await pull(userId); // 1. Primero bajar...
    const pushResult = await push(userId); // 2. ...después subir
    pushed += pushResult.pushed;
    failed += pushResult.failed;

    if (pushResult.pushed === 0) break;

    const remainingPending = await photosRepo.listPending(userId);
    if (remainingPending.length === 0) break;
  }

  return { pulled, pushed, failed, finishedAt: Date.now() };
}

// Singleton de ejecución: si se solicita sincronizar mientras hay un ciclo activo, se reutiliza
let runningSync: Promise<SyncResult> | null = null;

export function syncAll(userId: string): Promise<SyncResult> {
  if (!runningSync) {
    runningSync = runSync(userId).finally(() => {
      runningSync = null;
    });
  }
  return runningSync;
}
