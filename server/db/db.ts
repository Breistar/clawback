import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DB_PATH = path.join(here, 'clawback.db');
export const DOCUMENTS_DIR = path.resolve(here, '../../data/documents');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(readFileSync(path.join(here, 'schema.sql'), 'utf-8'));
  }
  return db;
}
