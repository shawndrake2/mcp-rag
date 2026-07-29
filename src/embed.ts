import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { EMBEDDING_MODEL, BGE_QUERY_PREFIX } from "./config.js";

export interface Embedder {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

// Local provider: runs bge-small-en-v1.5 (384-dim) in-process via ONNX.
// No API key, no cost, and the corpus never leaves the machine. Swap this
// class for an API-backed Embedder (Voyage, OpenAI) without touching the
// rest of the pipeline - queries and documents must always share a model.
export class LocalEmbedder implements Embedder {
  private extractor?: FeatureExtractionPipeline;

  private async load(): Promise<FeatureExtractionPipeline> {
    this.extractor ??= await pipeline("feature-extraction", EMBEDDING_MODEL, {
      dtype: "q8",
    });
    return this.extractor;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const extractor = await this.load();
    const out = await extractor(texts, { pooling: "mean", normalize: true });
    return out.tolist() as number[][];
  }

  async embedQuery(text: string): Promise<number[]> {
    const [v] = await this.embedDocuments([BGE_QUERY_PREFIX + text]);
    return v;
  }
}
