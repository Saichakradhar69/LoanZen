'use server';

interface ORMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ORChoice {
  message: { role: 'assistant'; content: string };
}

interface ORResponse {
  choices: ORChoice[];
}

export async function openRouterChat(messages: ORMessage[], model: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_READONLY || '';
  const fallback = process.env.OPENROUTER_FALLBACK_MODEL || model;

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in environment.');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://loanzen.app',
      'X-Title': 'LoanZen Advisor',
    },
    body: JSON.stringify({
      model: fallback,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter error: ${res.status} ${res.statusText} ${text}`);
  }

  const json = (await res.json()) as ORResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter response missing content.');
  return content.trim();
}

export type { ORMessage };


