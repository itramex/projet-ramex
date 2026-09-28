/**
 * M-23 Offline-first — persistance locale (SQLite via expo-sqlite) :
 * - `cache*` : cache de lecture des réponses GET (stale-while-revalidate),
 * - `queue*` : file d'écriture des mutations échouées hors réseau (FIFO),
 * - `lastSync*` : horodatage dernier succès GET par endpoint (pulls `?updated_since=`).
 */
import * as SQLite from 'expo-sqlite';

/** Mutation en attente d'envoi (corps JSON sérialisé). */
export type QueuedWrite = {
  id: number;
  method: string; // POST | PUT | PATCH | DELETE
  path: string; // ex: '/producteurs/'
  body: string | null;
  createdAt: string;
};

const DB_NAME = 'ramex-offline.db';

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  saved_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS last_sync (
  path TEXT PRIMARY KEY NOT NULL,
  synced_at TEXT NOT NULL
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(SCHEMA);
      return db;
    })().catch((err) => {
      dbPromise = null; // permettre une nouvelle tentative la fois suivante
      throw err;
    });
  }
  return dbPromise;
}

export const offlineStore = {
  /* ---------- cache de lecture ---------- */

  /** Met en cache la donnée d'une réponse GET (remplace la valeur existante). */
  async cacheSet(key: string, data: unknown): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO cache(key, payload, saved_at) VALUES(?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, saved_at = excluded.saved_at`,
        [key, JSON.stringify(data ?? null), new Date().toISOString()],
      );
    } catch {
      // Cache best-effort : jamais bloquant pour le réseau.
    }
  },

  /** Lit le cache d'une clé ; null si absent ou JSON corrompu. */
  async cacheGet<T>(key: string): Promise<{ data: T; savedAt: string } | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ payload: string; saved_at: string }>(
        'SELECT payload, saved_at FROM cache WHERE key = ?',
        [key],
      );
      if (!row) return null;
      return { data: JSON.parse(row.payload) as T, savedAt: row.saved_at };
    } catch {
      return null;
    }
  },

  /* ---------- dernier sync par endpoint ---------- */

  /** Horodate le dernier succès GET sur cet endpoint (ISO 8601). */
  async lastSyncTouch(path: string): Promise<void> {
    if (!path) return;
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO last_sync(path, synced_at) VALUES(?, ?)
         ON CONFLICT(path) DO UPDATE SET synced_at = excluded.synced_at`,
        [path, new Date().toISOString()],
      );
    } catch {
      // best-effort
    }
  },

  /** Date ISO du dernier succès GET sur cet endpoint, ou null. */
  async lastSyncGet(path: string): Promise<string | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ synced_at: string }>(
        'SELECT synced_at FROM last_sync WHERE path = ?',
        [path],
      );
      return row?.synced_at ?? null;
    } catch {
      return null;
    }
  },

  /* ---------- file d'écriture ---------- */

  /** Enfile une mutation à rejouer au retour du réseau. */
  async queueEnqueue(method: string, path: string, body: unknown): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT INTO sync_queue(method, path, body, created_at) VALUES(?, ?, ?, ?)',
        [method.toUpperCase(), path, body === undefined ? null : JSON.stringify(body), new Date().toISOString()],
      );
    } catch {
      // best-effort
    }
  },

  /** Liste les mutations en attente, dans l'ordre FIFO. */
  async queueList(): Promise<QueuedWrite[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        id: number;
        method: string;
        path: string;
        body: string | null;
        created_at: string;
      }>('SELECT id, method, path, body, created_at FROM sync_queue ORDER BY id ASC');
      return rows.map((r) => ({
        id: r.id,
        method: r.method,
        path: r.path,
        body: r.body,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  /** Retire une mutation envoyée avec succès (ou à abandonner). */
  async queueRemove(id: number): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
    } catch {
      // best-effort
    }
  },

  /** Nombre de mutations en attente (badge UI / logs). */
  async queueCount(): Promise<number> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_queue');
      return row?.n ?? 0;
    } catch {
      return 0;
    }
  },

  /** Purge complète (ex : déconnexion) : cache + file + horodatages. */
  async clearAll(): Promise<void> {
    try {
      const db = await getDb();
      await db.execAsync(
        'DELETE FROM cache; DELETE FROM sync_queue; DELETE FROM last_sync;',
      );
    } catch {
      // best-effort
    }
  },
};
