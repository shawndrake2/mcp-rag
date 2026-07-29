#!/usr/bin/env node
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { chunkMarkdown, embedText, type Chunk } from "./chunk.js";
import { LocalEmbedder } from "./embed.js";
import { openDb, clearRoot, insertChunks } from "./store.js";
import { retrieve, sourceLabel } from "./retrieve.js";

const [cmd, ...rest] = process.argv.slice(2);

async function main(): Promise<void> {
  if (cmd === "index") return indexCorpus(rest[0]);
  if (cmd === "query") return queryCmd(rest.join(" "));
  if (cmd === "ask") return askCmd(rest.join(" "));
  if (cmd === "serve") return (await import("./server.js")).serve();
  console.log(
    "usage: npm run rag -- index <corpus-dir> | query <question> | ask <question> | serve",
  );
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".md")) yield p;
  }
}

async function indexCorpus(dir: string): Promise<void> {
  if (!dir) throw new Error("usage: npm run rag -- index <corpus-dir>");
  // The resolved absolute path identifies this corpus; re-indexing it
  // replaces only its own chunks (see clearRoot).
  const root = resolve(dir);
  const chunks: Chunk[] = [];
  for (const path of walk(root)) {
    chunks.push(...chunkMarkdown(relative(root, path), readFileSync(path, "utf8")));
  }
  console.log(`chunked: ${chunks.length} chunks from ${root}`);

  const embedder = new LocalEmbedder();
  const db = openDb();
  clearRoot(db, root);
  for (let i = 0; i < chunks.length; i += 32) {
    const batch = chunks.slice(i, i + 32);
    const vectors = await embedder.embedDocuments(batch.map(embedText));
    insertChunks(db, root, batch, vectors);
    process.stdout.write(
      `\rembedded: ${Math.min(i + 32, chunks.length)}/${chunks.length}`,
    );
  }
  console.log("\ndone.");
}

async function queryCmd(q: string): Promise<void> {
  const hits = await retrieve(openDb(), new LocalEmbedder(), q);
  for (const h of hits) {
    console.log(`\n[${h.score.toFixed(3)}] ${sourceLabel(h.chunk)} > ${h.chunk.heading}`);
    const preview = h.chunk.text.slice(0, 280).replaceAll("\n", " ");
    console.log(preview + (h.chunk.text.length > 280 ? "…" : ""));
  }
}

async function askCmd(q: string): Promise<void> {
  const hits = await retrieve(openDb(), new LocalEmbedder(), q);
  const { ask } = await import("./ask.js");
  console.log(await ask(q, hits));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
