// Minimal Claude Messages API client over fetch — no SDK dependency, which keeps
// the Worker bundle small and avoids version drift in the edge runtime.
// https://docs.anthropic.com/en/api/messages

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export interface ClaudeCallOptions {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface MessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

/** Single-turn call. Returns the concatenated text content. */
export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const res = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.4,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  const data = (await res.json()) as MessagesResponse;
  if (!res.ok) {
    throw new Error(
      `Claude ${res.status}: ${data.error?.message ?? "request failed"}`,
    );
  }
  return (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}

/**
 * Parse a JSON object out of a model response, tolerating ```json fences and
 * leading/trailing prose. Throws if no object can be found.
 */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("extractJson: no JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
