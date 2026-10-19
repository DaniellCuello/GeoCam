import * as Crypto from 'expo-crypto';
import { and, desc, eq, isNotNull, isNull, like, type SQL } from 'drizzle-orm';

import { db } from '../client';
import { photos, type NewPhoto, type Photo } from '../schema';

export type AlbumFilter = number | null | 'all';

export type PhotoFilters = {
  search?: string;
  albumId?: AlbumFilter;
  onlyFavorites?: boolean;
  ownerId?: string | null;
};

function conditions(filters: PhotoFilters = {}): SQL[] {
  const clauses: SQL[] = [];
  const search = filters.search?.trim();

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
  return db.select().from(photos).where(eq(photos.id, id)).limit(1);
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

// Marca la foto como sincronizada sin alterar updatedAt
export async function markSynced(id: number, remotePath: string): Promise<Photo | null> {
  const [photo] = await db
    .update(photos)
    .set({ remotePath, syncedAt: new Date() })
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

// Obtiene fotos locales pendientes de subir a la nube
export async function listUnsynced(ownerId?: string | null): Promise<Photo[]> {
  const clauses: SQL[] = [];
  if (ownerId) {
    clauses.push(eq(photos.ownerId, ownerId));
  }

  const allPhotos = await db
    .select()
    .from(photos)
    .where(clauses.length ? and(...clauses) : undefined);

  return allPhotos.filter(
    (p) => !p.syncedAt || (p.updatedAt && p.syncedAt.getTime() < p.updatedAt.getTime())
  );
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
  create,
  update,
  markSynced,
  ensureSyncFields,
  listUnsynced,
  remove,
  clearAll,
};
