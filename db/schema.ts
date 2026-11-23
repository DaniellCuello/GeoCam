import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const albums = sqliteTable('albums', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const photos = sqliteTable(
  'photos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uri: text('uri').notNull(),
    latitude: real('latitude'),
    longitude: real('longitude'),
    accuracy: real('accuracy'),
    source: text('source', { enum: ['camera', 'gallery'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    albumId: integer('album_id').references(() => albums.id, { onDelete: 'set null' }),
    note: text('note'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),

    // Semana 8: Identidad compartida con la nube y sincronización
    clientId: text('client_id').unique().$defaultFn(() => generateUUID()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
    remotePath: text('remote_path'),
    syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
    // C5: Usuario propietario de la foto para separación local multi-usuario
    ownerId: text('owner_id'),

    // Semana 9 (C1): Borrado lógico sincronizado
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),

    // Semana 10 (T3): Descripción generada con IA
    aiDescription: text('ai_description'),
  },
  (table) => [index('photos_created_at_idx').on(table.createdAt)]
);

// Semana 9 (T3): metadatos de sincronización (cursor de bajada)
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Semana 10 (C1): Persistencia del historial de chat en SQLite
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  parts: text('parts'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type SyncMeta = typeof syncMeta.$inferSelect;
export type NewSyncMeta = typeof syncMeta.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
