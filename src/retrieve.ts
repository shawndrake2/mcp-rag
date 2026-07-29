import type Database from "better-sqlite3";
import { allChunks, type StoredChunk } from "./store.js";
import type { Embedder } from "./embed.js";
import { DEFAULT_TOP_K } from "./config.js";

export interface Hit {
  score: number;
  chunk: StoredChunk;
}

// Exact nearest-neighbor search. Vectors are L2-normalized, so cosine
// similarity reduces to a dot product. At this corpus scale (hundreds of
// chunks) brute force is exact and instant - ANN indexes like HNSW exist to
// approximate this at millions of vectors, not to replace it here.
export async function retrieve(
  db: Database.Database,
  embedder: Embedder,
  query: string,
  opts: { topK?: number; file?: string } = {},
): Promise<Hit[]> {
  const qv = await embedder.embedQuery(query);
  return allChunks(db)
    .filter((c) => !opts.file || c.file.includes(opts.file))
    .map((chunk) => ({ chunk, score: dot(qv, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.topK ?? DEFAULT_TOP_K);
}

function dot(a: number[], b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < b.length; i++) s += a[i] * b[i];
  return s;
}
