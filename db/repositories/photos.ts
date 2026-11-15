import * as Crypto from 'expo-crypto';
import { and, asc, desc, eq, gt, isNotNull, isNull, like, or, type SQL } from 'drizzle-orm';

import { db } from '../client';
import { photos, type NewPhoto, type Photo } from '../schema';

export type AlbumFilter = number | null | 'all';

export type PhotoFilters = {
  search?: string;
  albumId?: AlbumFilter;
  onlyFavorites?: boolean;
  ownerId?: string | null;
  includeDeleted?: boolean;
};

function conditions(filters: PhotoFilters = {}): SQL[] {
  const clauses: SQL[] = [];
  const search = filters.search?.trim();

  // C1: Excluir fotos con borrado lógico para la UI cotidiana
  if (!filters.includeDeleted) {
    clauses.push(isNull(photos.deletedAt));
  }

  if (search) {
    clauses.push(like(photos.note, `%${search}%`));
  }

  if (filters.albumId !== undefined && filters.albumId !== 'all') {
    clauses.push(
      filters.albumId === null ? isNull(photos.albumId) : eq(photos.albumId, filters.albumId)
    );
  }

  if (filters.onlyFavorites) {
    clauses.push(eq(photos.favorite, true));
  }

  // C5: Filtrado por usuario propietario de la sesión
  if (filters.ownerId) {
    clauses.push(eq(photos.ownerId, filters.ownerId));
  }

  return clauses;
}

export function listQuery(filters: PhotoFilters = {}) {
  const clauses = conditions(filters);
  return db
    .select()
    .from(photos)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(photos.createdAt));
}

export function withLocationQuery(filters: PhotoFilters = {}) {
  const clauses = [...conditions(filters), isNotNull(photos.latitude)];
  return db
    .select()
    .from(photos)
    .where(and(...clauses))
    .orderBy(desc(photos.createdAt));
}

export async function create(input: NewPhoto): Promise<Photo> {
  const [photo] = await db.insert(photos).values(input).returning();

  if (!photo) {
    throw new Error('SQLite no devolvió la fotografía recién creada.');
  }

  return photo;
}

export function byIdQuery(id: number) {
  return db.select().from(photos).where(and(eq(photos.id, id), isNull(photos.deletedAt))).limit(1);
}

export async function findById(id: number): Promise<Photo | null> {
  const row = await db.select().from(photos).where(eq(photos.id, id)).get();
  return row ?? null;
}

// Cada edición actualiza updatedAt para indicar que está pendiente de sincronización
export async function update(
  id: number,
  values: Partial<Pick<Photo, 'note' | 'favorite' | 'albumId'>>
) {
  const [photo] = await db
    .update(photos)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(photos.id, id))
    .returning();
  return photo ?? null;
}

// Marca la foto como sincronizada fijando remotePath y syncedAt
export async function markSynced(id: number, remotePath: string, syncedAt: Date = new Date()): Promise<Photo | null> {
  const [photo] = await db
    .update(photos)
    .set({ remotePath, syncedAt })
    .where(eq(photos.id, id))
    .returning();
  return photo ?? null;
}

// Rellena fotos antiguas que quedaron sin clientId o updatedAt antes de la migración
export async function ensureSyncFields(ownerId?: string | null): Promise<void> {
  const rows = await db.select().from(photos).where(isNull(photos.clientId));
  for (const row of rows) {
    await db
      .update(photos)
      .set({
        clientId: Crypto.randomUUID(),
        updatedAt: row.updatedAt ?? row.createdAt,
        ownerId: row.ownerId ?? ownerId ?? null,
      })
      .where(eq(photos.id, row.id));
  }
}

// Semana 9: Consulta reactiva de fotos pendientes de sincronizar (T3)
export function pendingQuery(ownerId?: string | null) {
  const clauses: SQL[] = [or(isNull(photos.syncedAt), gt(photos.updatedAt, photos.syncedAt))!];
  if (ownerId) {
    clauses.push(eq(photos.ownerId, ownerId));
  }
  return db
    .select()
    .from(photos)
    .where(and(...clauses))
    .orderBy(asc(photos.createdAt));
}

export async function listPending(ownerId?: string | null): Promise<Photo[]> {
  const clauses: SQL[] = [or(isNull(photos.syncedAt), gt(photos.updatedAt, photos.syncedAt))!];
  if (ownerId) {
    clauses.push(eq(photos.ownerId, ownerId));
  }
  return await db
    .select()
    .from(photos)
    .where(and(...clauses))
    .orderBy(asc(photos.createdAt));
}

// Alias de compatibilidad
export async function listUnsynced(ownerId?: string | null): Promise<Photo[]> {
  return listPending(ownerId);
}

export async function findByClientId(clientId: string): Promise<Photo | null> {
  const row = await db.select().from(photos).where(eq(photos.clientId, clientId)).get();
  return row ?? null;
}

export async function insertFromRemote(data: NewPhoto): Promise<Photo> {
  const [photo] = await db.insert(photos).values(data).returning();
  return photo;
}

export async function applyRemote(
  id: number,
  changes: {
    note?: string | null;
    favorite?: boolean;
    updatedAt: Date;
    syncedAt: Date;
    deletedAt?: Date | null;
  }
): Promise<Photo | null> {
  const [photo] = await db.update(photos).set(changes).where(eq(photos.id, id)).returning();
  return photo ?? null;
}

// C1: Borrado lógico. Marca con deletedAt y updatedAt = now()
export async function softDelete(id: number): Promise<Photo | null> {
  const now = new Date();
  const [photo] = await db
    .update(photos)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(photos.id, id))
    .returning();
  return photo ?? null;
}

export async function remove(id: number): Promise<Photo | null> {
  const [photo] = await db.delete(photos).where(eq(photos.id, id)).returning();
  return photo ?? null;
}

export async function clearAll(ownerId?: string | null): Promise<Photo[]> {
  if (ownerId) {
    return db.delete(photos).where(eq(photos.ownerId, ownerId)).returning();
  }
  return db.delete(photos).returning();
}

export const photosRepo = {
  listQuery,
  withLocationQuery,
  byIdQuery,
  findById,
  create,
  update,
  markSynced,
  ensureSyncFields,
  pendingQuery,
  listPending,
  listUnsynced,
  findByClientId,
  insertFromRemote,
  applyRemote,
  softDelete,
  remove,
  clearAll,
};
