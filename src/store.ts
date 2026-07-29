import Database from "better-sqlite3";
import { DB_PATH } from "./config.js";
import type { Chunk } from "./chunk.js";

export interface StoredChunk extends Chunk {
  id: number;
  embedding: Float32Array;
}

export function openDb(path: string = DB_PATH): Database.Database {
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY,
    file TEXT NOT NULL,
    heading TEXT NOT NULL,
    text TEXT NOT NULL,
    meta TEXT NOT NULL,
    embedding BLOB NOT NULL
  )`);
  return db;
}

export function clearChunks(db: Database.Database): void {
  db.exec("DELETE FROM chunks");
}

export function insertChunks(
  db: Database.Database,
  chunks: Chunk[],
  vectors: number[][],
): void {
  const stmt = db.prepare(
    "INSERT INTO chunks (file, heading, text, meta, embedding) VALUES (?, ?, ?, ?, ?)",
  );
  const insertAll = db.transaction(() => {
    chunks.forEach((c, i) => {
      stmt.run(
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
