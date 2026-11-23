import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

export type AppDb = ExpoSQLiteDatabase<typeof schema> & {
  $client: SQLiteDatabase;
};

const sqlite = openDatabaseSync('geocam.db', { enableChangeListener: true });
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db: AppDb = drizzle(sqlite, { schema });

/**
 * No-op en plataformas nativas (iOS y Android), donde la base de datos se inicializa sincrónicamente.
 */
export async function initWebDatabase(): Promise<void> {
  return Promise.resolve();
}
