import { asc, eq } from 'drizzle-orm';

import { db } from '../client';
import { albums, type Album } from '../schema';

export function listQuery() {
  return db.select().from(albums).orderBy(asc(albums.name));
}

export async function create(name: string): Promise<Album> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error('Escribe un nombre para el álbum.');
  }

  const [album] = await db.insert(albums).values({ name: cleanName }).returning();

  if (!album) {
    throw new Error('SQLite no devolvió el álbum recién creado.');
  }

  return album;
}

export async function remove(id: number): Promise<void> {
  await db.delete(albums).where(eq(albums.id, id));
}
