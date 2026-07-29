# mcp-rag

Retrieval-Augmented Generation over any local markdown corpus, exposed as an MCP tool.

Point it at a directory of markdown files. It chunks them at heading boundaries (frontmatter becomes filterable metadata), embeds the chunks, and stores vectors in a local SQLite index. Query it from a CLI for grounded, cited answers - or connect it to any MCP-compatible client (Claude Code, Claude Desktop, Cursor) as a `search_corpus` tool and let the model drive retrieval itself.

Built as a deliberately transparent reference implementation of the full RAG component chain: ingestion, structure-aware chunking, embeddings, vector storage, retrieval, and grounded generation with citations. No vector database required - at reference-corpus scale, exact cosine search over SQLite is honest and simple.

## Pipeline

```
index:  markdown dir -> parse frontmatter -> chunk at headings -> embed -> SQLite
query:  question -> embed -> cosine top-k (+ metadata filters) -> grounded answer + citations
serve:  the query pipeline behind an MCP tool, so the model decides when and what to retrieve
```

## Status

Early scaffold. Roadmap:

- [ ] `index` command: ingest + chunk + embed a corpus directory into SQLite
- [ ] `query` command: retrieve top-k chunks, print with sources
- [ ] `ask` command: grounded generation with citations (Claude)
- [ ] `serve` command: MCP server exposing `search_corpus`
- [ ] Golden-question eval harness (recall@k over a labeled question set)
- [ ] Hybrid retrieval (BM25 + dense) when the eval shows vocabulary-mismatch misses
