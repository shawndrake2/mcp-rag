import Database from "better-sqlite3";
import { DB_PATH } from "./config.js";
import type { Chunk } from "./chunk.js";

export interface StoredChunk extends Chunk {
  id: number;
  root: string; // absolute path of the corpus directory this chunk came from
  embedding: Float32Array;
}

export function openDb(path: string = DB_PATH): Database.Database {
  const db = new Database(path);
  // An index is disposable derived data: if the table predates the `root`
  // column, drop and rebuild rather than migrate. Re-running `index` restores it.
  const cols = db.prepare("PRAGMA table_info(chunks)").all() as { name: string }[];
  if (cols.length > 0 && !cols.some((c) => c.name === "root")) {
    db.exec("DROP TABLE chunks");
  }
  db.exec(`CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY,
    root TEXT NOT NULL,
    file TEXT NOT NULL,
    heading TEXT NOT NULL,
    text TEXT NOT NULL,
    meta TEXT NOT NULL,
    embedding BLOB NOT NULL
  )`);
  return db;
}

// Scoped wipe: re-indexing one corpus root replaces only that root's chunks.
// Other indexed corpora are untouched, so sources refresh independently.
export function clearRoot(db: Database.Database, root: string): void {
  db.prepare("DELETE FROM chunks WHERE root = ?").run(root);
}

export function insertChunks(
  db: Database.Database,
  root: string,
  chunks: Chunk[],
  vectors: number[][],
): void {
  const stmt = db.prepare(
    "INSERT INTO chunks (root, file, heading, text, meta, embedding) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertAll = db.transaction(() => {
    chunks.forEach((c, i) => {
      stmt.run(
        root,
        c.file,
        c.heading,
        c.text,
        JSON.stringify(c.meta),
        Buffer.from(new Float32Array(vectors[i]).buffer),
      );
    });
  });
  insertAll();
}

export function allChunks(db: Database.Database): StoredChunk[] {
  return db
    .prepare("SELECT * FROM chunks")
    .all()
    .map((r: any) => ({
      id: r.id,
      root: r.root,
      file: r.file,
      heading: r.heading,
      text: r.text,
      meta: JSON.parse(r.meta),
      embedding: new Float32Array(
        r.embedding.buffer,
        r.embedding.byteOffset,
        r.embedding.byteLength / 4,
      ),
    }));
}
