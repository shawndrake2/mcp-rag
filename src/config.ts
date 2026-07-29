export const EMBEDDING_MODEL = "Xenova/bge-small-en-v1.5";

// bge models are trained with an instruction prefix on the QUERY side only;
// documents are embedded bare. Asymmetry is intentional.
export const BGE_QUERY_PREFIX =
  "Represent this sentence for searching relevant passages: ";

export const DB_PATH = process.env.RAG_DB ?? "index.sqlite";
export const MAX_CHUNK_CHARS = 1500;
export const DEFAULT_TOP_K = 5;
export const ANSWER_MODEL = "claude-opus-5";
