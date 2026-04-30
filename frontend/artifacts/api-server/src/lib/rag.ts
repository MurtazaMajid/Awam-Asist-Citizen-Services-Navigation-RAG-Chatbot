/**
 * Optional RAG (Retrieval-Augmented Generation) integration.
 *
 * If you set the env var `RAG_API_URL` to a URL like:
 *   https://your-fastapi-host.com/retrieve
 *
 * then before each chat completion we POST:
 *   { "query": "<user's latest message>", "category": "<category>", "top_k": 5 }
 *
 * Your FastAPI endpoint should respond with JSON of the form:
 *   { "chunks": [ { "text": "...", "source": "..." }, ... ] }
 *
 * `source` is optional. Only `text` is required.
 *
 * If RAG_API_URL is not set, retrieval is skipped and the static knowledge base
 * in chat.ts is used as the only context.
 */

export interface RagChunk {
  text: string;
  source?: string;
}

export interface RagResponse {
  chunks: RagChunk[];
}

const RAG_API_URL = process.env.RAG_API_URL;
const RAG_API_KEY = process.env.RAG_API_KEY;
const RAG_TIMEOUT_MS = Number(process.env.RAG_TIMEOUT_MS ?? 8000);
const RAG_TOP_K = Number(process.env.RAG_TOP_K ?? 5);

export const ragEnabled = Boolean(RAG_API_URL);

export async function retrieveContext(
  query: string,
  category: string,
): Promise<RagChunk[]> {
  if (!RAG_API_URL) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (RAG_API_KEY) headers["Authorization"] = `Bearer ${RAG_API_KEY}`;

    const res = await fetch(RAG_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, category, top_k: RAG_TOP_K }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`RAG API returned ${res.status}`);
    }

    const data = (await res.json()) as Partial<RagResponse>;
    if (!Array.isArray(data.chunks)) return [];

    return data.chunks
      .filter(
        (c): c is RagChunk =>
          c != null && typeof c === "object" && typeof c.text === "string",
      )
      .map((c) => ({
        text: c.text,
        source: typeof c.source === "string" ? c.source : undefined,
      }));
  } finally {
    clearTimeout(timer);
  }
}

export function formatChunks(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";
  const lines = chunks.map((c, i) => {
    const header = c.source
      ? `[${i + 1}] (source: ${c.source})`
      : `[${i + 1}]`;
    return `${header}\n${c.text}`;
  });
  return [
    "=== RETRIEVED CONTEXT (from RAG pipeline) ===",
    "Use the following retrieved passages as your primary source of truth. If the retrieved passages contradict the static knowledge base below, prefer the retrieved passages. If the retrieved passages do not contain the answer, fall back to the static knowledge base. Do not invent facts.",
    "",
    ...lines,
  ].join("\n");
}
