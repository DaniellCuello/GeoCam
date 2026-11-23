import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

export type AppDb = ExpoSQLiteDatabase<typeof schema> & {
  $client: SQLiteDatabase;
};

let sqliteInstance: SQLiteDatabase | null = null;
let dbInstance: AppDb | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Inicializa la base de datos de forma asíncrona en la web esperando a que el Web Worker
 * de wa-sqlite termine de cargarse por completo.
 */
export async function initWebDatabase(): Promise<void> {
  if (dbInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let attempts = 0;
    while (attempts < 10) {
      try {
        sqliteInstance = await openDatabaseAsync('geocam.db', { enableChangeListener: true });
        await sqliteInstance.execAsync('PRAGMA foreign_keys = ON;');
        dbInstance = drizzle(sqliteInstance, { schema });
        return;
      } catch (err: any) {
        attempts++;
        if (attempts >= 10) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  })();

  return initPromise;
}

/**
 * Proxy de acceso seguro para la instancia Drizzle en Web.
 * Redirige llamadas a la instancia inicializada tras resolver `initWebDatabase()`.
 */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    if (!dbInstance) {
      try {
        const { openDatabaseSync } = require('expo-sqlite');
        const syncSqlite: SQLiteDatabase = openDatabaseSync('geocam.db', { enableChangeListener: true });
        syncSqlite.execSync('PRAGMA foreign_keys = ON;');
        sqliteInstance = syncSqlite;
        dbInstance = drizzle(syncSqlite, { schema });
      } catch {
        throw new Error(
          `SQLite Web Worker no está listo todavía al acceder a 'db.${String(prop)}'. Asegúrese de esperar a 'await initWebDatabase()' antes de acceder a la base de datos en la web.`
        );
      }
    }
    const val = Reflect.get(dbInstance!, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(dbInstance);
    }
    return val;
  },
  has(_target, prop) {
    if (dbInstance) {
      return prop in dbInstance;
    }
    return true;
  },
});
