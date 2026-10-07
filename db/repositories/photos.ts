import { and, desc, eq, isNotNull, isNull, like, type SQL } from 'drizzle-orm';

import { db } from '../client';
import { photos, type NewPhoto, type Photo } from '../schema';

export type AlbumFilter = number | null | 'all';

export type PhotoFilters = {
  search?: string;
  albumId?: AlbumFilter;
  onlyFavorites?: boolean;
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

export async function update(id: number, values: Partial<Pick<Photo, 'note' | 'favorite' | 'albumId'>>) {
  const [photo] = await db.update(photos).set(values).where(eq(photos.id, id)).returning();
  return photo ?? null;
}

export async function remove(id: number): Promise<Photo | null> {
  const [photo] = await db.delete(photos).where(eq(photos.id, id)).returning();
  return photo ?? null;
}

export async function clearAll(): Promise<Photo[]> {
  return db.delete(photos).returning();
}
