import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { openDb } from "./store.js";
import { LocalEmbedder } from "./embed.js";
import { retrieve } from "./retrieve.js";

// Agentic RAG: the retrieval pipeline behind an MCP tool. The connected
// model decides when to search, what query to send, and whether to search
// again - this server just answers each search well.
export async function serve(): Promise<void> {
  const db = openDb();
  const embedder = new LocalEmbedder();
  const server = new McpServer({ name: "mcp-rag", version: "0.1.0" });

  server.tool(
    "search_corpus",
    "Semantic search over the indexed markdown corpus. Returns the most relevant chunks with their source file and heading. Call this whenever a question depends on facts from the corpus rather than general knowledge.",
    {
      query: z.string().describe("Natural-language search query"),
      top_k: z
        .number()
        .optional()
        .describe("How many chunks to return (default 5)"),
      file_filter: z
        .string()
        .optional()
        .describe("Only search files whose path contains this substring"),
    },
    async ({ query, top_k, file_filter }) => {
      const hits = await retrieve(db, embedder, query, {
        topK: top_k,
        file: file_filter,
      });
      const text = hits
        .map(
          (h) =>
            `[score ${h.score.toFixed(3)}] ${h.chunk.file} > ${h.chunk.heading}\n${h.chunk.text}`,
        )
        .join("\n\n---\n\n");
      return { content: [{ type: "text" as const, text: text || "No results." }] };
    },
  );

  await server.connect(new StdioServerTransport());
}
