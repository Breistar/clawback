/**
 * Vultr Serverless Inference clients (track requirement).
 * - Reasoning: Qwen/Qwen3.6-27B through the OpenAI-compatible chat API.
 * - Document retrieval: VultronRetriever Prime through /v1/rerank.
 */
import OpenAI from 'openai';

export const VULTR_BASE_URL = 'https://api.vultrinference.com/v1';
// Kimi-K2.6: non-thinking, native tool calling. Qwen3.6 was tried first but the
// endpoint clamps completions at 2,048 tokens and Qwen burns that entire budget
// on hidden reasoning with a long system prompt, dying before the tool call.
export const REASONING_MODEL = 'moonshotai/Kimi-K2.6';
export const RETRIEVER_MODEL = 'vultr/VultronRetrieverPrime-Qwen3.5-8B';

export const hasVultrKey = () => Boolean(process.env.VULTR_INFERENCE_API_KEY);

let client: OpenAI | null = null;
export function vultrChat(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: VULTR_BASE_URL,
      apiKey: process.env.VULTR_INFERENCE_API_KEY,
      timeout: 90_000,
      maxRetries: 1,
    });
  }
  return client;
}

export type RerankHit = { index: number; text: string; score: number };

/** Rank candidate document sections against a query with VultronRetriever. */
export async function rerank(query: string, documents: string[]): Promise<RerankHit[]> {
  const res = await fetch(`${VULTR_BASE_URL}/rerank`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VULTR_INFERENCE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: RETRIEVER_MODEL, query, documents }),
  });
  if (!res.ok) throw new Error(`rerank failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { results: { index: number; document: { text: string }; relevance_score: number }[] };
  return data.results.map((r) => ({ index: r.index, text: r.document.text, score: r.relevance_score }));
}
