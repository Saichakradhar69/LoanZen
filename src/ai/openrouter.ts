'use server';

export type ORMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function callOpenRouter(messages: ORMessage[], model?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const configured = (model || process.env.OPENROUTER_MODEL)?.trim();
  const fallbacksEnv = (process.env.OPENROUTER_MODEL_FALLBACKS || '').split(',').map(s => s.trim()).filter(Boolean);
  const fallbackList = [
    ...(configured ? [configured] : []),
    ...fallbacksEnv,
    'openrouter/auto',
    'deepseek/deepseek-r1:free',
    'qwen/qwen2.5-7b-instruct:free',
  ];

  let lastErr: any = null;
  for (const mdl of fallbackList) {
    // Try each model with small retry/backoff on 429/5xx
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://loanzen.app',
            'X-Title': 'LoanZen Advisor',
          },
          body: JSON.stringify({ model: mdl, messages, temperature: 0.2 }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          // On 429 or 5xx, retry or fall through to next model
          if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
            lastErr = new Error(`OpenRouter error ${res.status} for ${mdl}: ${body}`);
            // simple backoff
            await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
            continue;
          }
          throw new Error(`OpenRouter error ${res.status} for ${mdl}: ${body}`);
        }

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (!content) throw new Error('OpenRouter response missing content');
        return content.trim();
      } catch (e) {
        lastErr = e;
        // On fetch/network errors, retry once then next model
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    // next model
  }

  throw new Error(String(lastErr?.message || lastErr || 'All OpenRouter models failed'));
}
