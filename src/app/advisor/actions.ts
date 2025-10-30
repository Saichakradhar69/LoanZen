'use server';

import { callOpenRouter, ORMessage } from '@/ai/openrouter';

export async function advisorReply(args: {
  userProfile: any;
  loans: any[];
  history: { role: 'user' | 'model'; content: string }[];
  message: string;
}) {
  const { userProfile, loans, history, message } = args;

  const system = `You are LoanZen's AI advisor. Be concise, friendly, and practical. Use the user's real data.

User profile (JSON):\n${JSON.stringify({
  displayName: userProfile?.displayName ?? null,
  subscriptionStatus: userProfile?.subscriptionStatus ?? null,
  trialEnds: userProfile?.trialEnds ?? null,
  createdAt: userProfile?.createdAt ?? null,
})}

User loans with recent payments (JSON):\n${JSON.stringify(loans)}

Guidelines:\n- If user asks for payoff plans, compare avalanche (highest APR first) vs snowball (lowest balance first) using their balances and rates.\n- Show brief calculations when recommending steps (e.g., interest per month, savings).\n- Use recent payments to infer behavior and momentum; praise consistency and suggest improvements.\n- If data seems missing or ambiguous, ask one short clarifying question.\n- Keep answers under 180 words unless user asks for more.\n- When giving amounts, format as currency when appropriate.`;

  const messages: ORMessage[] = [
    { role: 'system', content: system },
    ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: message },
  ];

  try {
    const content = await callOpenRouter(messages);
    return { ok: true, content } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'AI request failed' } as const;
  }
}

 
