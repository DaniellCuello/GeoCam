// db/repositories/syncMeta.ts
// Semana 9: almacena pares clave-valor de sincronización (cursor de bajada lastPulledAt).
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { syncMeta } from '../schema';

export const syncMetaRepo = {
  async get(key: string): Promise<string | null> {
    const row = await db.select().from(syncMeta).where(eq(syncMeta.key, key)).get();
    return row?.value ?? null;
  },

  async set(key: string, value: string) {
    await db
      .insert(syncMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: syncMeta.key, set: { value } });
  },
};
