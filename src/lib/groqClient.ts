import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_TIMEOUT_MS = 30_000;

function cleanJsonString(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const firstBrace = text.search(/[\[{]/);
  if (firstBrace > 0) {
    text = text.slice(firstBrace);
  }

  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.slice(0, lastBrace + 1);
  }


  text = text.replace(/,\s*([\]}])/g, '$1');

  return text;
}

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

interface CallOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

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
          max_tokens: 2800,
        },
        { signal: controller.signal as any },
      );

      clearTimeout(timer);

      const text = response.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('Empty response from Groq');
      return text;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err?.name === 'AbortError') {
        throw new Error(`Groq request timed out after ${timeoutMs}ms`);
      }

      if (err?.status === 429) {
        throw new Error('RATE_LIMIT: AI service quota exhausted. Please try again in a few hours.');
      }

      if (err?.status && err.status >= 500) continue;
      throw lastError;
    }
  }

  throw lastError ?? new Error('Groq call failed after retries');
}


export async function callGroqForJson<T = unknown>(
  prompt: string,
  systemPrompt?: string,
  options: CallOptions = {},
): Promise<T> {
  const { maxRetries = 2, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

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