import Anthropic from "@anthropic-ai/sdk";
import type { Hit } from "./retrieve.js";
import { ANSWER_MODEL } from "./config.js";

// The grounding contract: answer only from context, cite sources, admit gaps.
// This instruction is what separates RAG from the model answering from its
// training data with the context as garnish.
const SYSTEM = `You answer questions using ONLY the provided context chunks.
Cite the source of every claim inline, like [file.md > Heading].
If the context does not contain the answer, reply "Not in the corpus." - never fall back to general knowledge.`;

export async function ask(question: string, hits: Hit[]): Promise<string> {
  const client = new Anthropic();
  const context = hits
    .map(
      (h, i) =>
        `<chunk index="${i + 1}" source="${h.chunk.file} > ${h.chunk.heading}">\n${h.chunk.text}\n</chunk>`,
    )
    .join("\n\n");

  const response = await client.beta.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    // Safety classifiers can decline a request on this model tier; the
    // fallback re-serves it on Anthropic's recommended substitute model.
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      { role: "user", content: `${context}\n\nQuestion: ${question}` },
    ],
  } as Parameters<typeof client.beta.messages.create>[0]);

  if (response.stop_reason === "refusal") {
    return "(request declined by safety classifiers)";
  }
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
