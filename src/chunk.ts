import matter from "gray-matter";
import { MAX_CHUNK_CHARS } from "./config.js";

export interface Chunk {
  file: string; // corpus-relative path
  heading: string; // section heading this chunk came from
  text: string;
  meta: Record<string, unknown>; // YAML frontmatter, if any
}

// Structure-aware chunking: split at markdown headings so each chunk is one
// coherent section, then split oversized sections at paragraph boundaries
// with a one-paragraph overlap so a sentence near a boundary is findable
// from either side.
export function chunkMarkdown(relPath: string, raw: string): Chunk[] {
  const { data: frontmatter, content } = matter(raw);
  const sections: { heading: string; lines: string[] }[] = [
    { heading: "(intro)", lines: [] },
  ];
  for (const line of content.split("\n")) {
    const m = /^(#{1,4})\s+(.*)/.exec(line);
    if (m) sections.push({ heading: m[2].trim(), lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }

  const chunks: Chunk[] = [];
  for (const s of sections) {
    const text = s.lines.join("\n").trim();
    if (!text) continue;
    for (const piece of splitLong(text)) {
      chunks.push({ file: relPath, heading: s.heading, text: piece, meta: frontmatter });
    }
  }
  return chunks;
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const paras = text.split(/\n{2,}/);
  const pieces: string[] = [];
  let current = "";
  let lastPara = "";
  for (const p of paras) {
    if (current && current.length + p.length + 2 > MAX_CHUNK_CHARS) {
      pieces.push(current);
      current = lastPara ? lastPara + "\n\n" + p : p; // one-paragraph overlap
    } else {
      current = current ? current + "\n\n" + p : p;
    }
    lastPara = p;
  }
  if (current) pieces.push(current);
  return pieces;
}
