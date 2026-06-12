// src/lib/groqClient.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── JSON cleaning helpers ────────────────────────────────────────────────────

/**
 * Strips markdown code fences, leading/trailing whitespace, and common
 * Groq preamble patterns that prevent JSON.parse from succeeding.
 */
function cleanJsonString(raw: string): string {
  let text = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Strip any leading non-JSON text before the first { or [
  const firstBrace = text.search(/[\[{]/);
  if (firstBrace > 0) {
    text = text.slice(firstBrace);
  }

  // Strip any trailing text after the last } or ]
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.slice(0, lastBrace + 1);
  }

  // Remove trailing commas before } or ] — common Groq artefact
  text = text.replace(/,\s*([\]}])/g, '$1');

  return text;
}

/**
 * Attempts to parse JSON, applying cleaning first.
 * Throws a descriptive error if parsing still fails.
 */
function safeParseJson<T>(raw: string): T {
  const cleaned = cleanJsonString(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (e: any) {
    throw new Error(
      `JSON parse failed after cleaning. Raw snippet: "${raw.slice(0, 200)}…" | Error: ${e.message}`,
    );
  }
}

// ─── Core call wrappers ───────────────────────────────────────────────────────

interface CallOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Call Groq and return the raw text response.
 * Retries on transient network / server errors (not on parse errors).
 */
export async function callGroq(
  prompt: string,
  systemPrompt?: string,
  options: CallOptions = {},
): Promise<string> {
  const { maxRetries = 2, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential back-off: 1s, 2s
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await groq.chat.completions.create(
        {
          model: GROQ_MODEL,
          messages,
          temperature: 0.1,
          max_tokens: 4096,
        },
        { signal: controller.signal as any },
      );

      clearTimeout(timer);

      const text = response.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('Empty response from Groq');
      return text;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Abort = timeout, do not retry
      if (err?.name === 'AbortError') {
        throw new Error(`Groq request timed out after ${timeoutMs}ms`);
      }

      // Rate limit (429) — wait longer then retry
      if (err?.status === 429) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }

      // 5xx — retry
      if (err?.status && err.status >= 500) continue;

      // Anything else (4xx, parse error from caller) — don't retry
      throw lastError;
    }
  }

  throw lastError ?? new Error('Groq call failed after retries');
}

/**
 * Call Groq and parse the response as JSON.
 * Automatically retries if the response is not valid JSON (up to maxRetries).
 */
export async function callGroqForJson<T = unknown>(
  prompt: string,
  systemPrompt?: string,
  options: CallOptions = {},
): Promise<T> {
  const { maxRetries = 2, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Add a hard JSON instruction to the system prompt
  const jsonSystemPrompt = [
    systemPrompt,
    'CRITICAL: Respond with ONLY a valid JSON object or array. No markdown, no code fences, no explanation — raw JSON only.',
  ]
    .filter(Boolean)
    .join('\n\n');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }

    try {
      const raw = await callGroq(prompt, jsonSystemPrompt, { timeoutMs, maxRetries: 0 });
      return safeParseJson<T>(raw);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry JSON parse failures, not timeouts or hard API errors
      if (
        err.message?.includes('JSON parse failed') ||
        err.message?.includes('Empty response')
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Groq JSON call failed after retries');
}

export default groq;