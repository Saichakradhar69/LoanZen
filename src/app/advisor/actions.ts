
'use server';

// import { getPrepaymentAdvice } from '@/ai/flows/prepayment-advisor';
import { openRouterChat } from '@/ai/openrouter';

// Define the shape of a message for the AI flow and Firestore
interface Message {
  role: 'user' | 'model';
  content: string;
}

// No server-side Firebase usage here.

// This is the main action that will be called from the chat interface.
export async function askAdvisorAction(
  userId: string,
  chatId: string,
  messageContent: string,
  context?: {
    userProfile?: any;
    loans?: any[];
    history?: { role: 'user' | 'model'; content: string }[];
  }
) {

  if (!userId || !chatId) {
    return { type: 'error', error: 'User or Chat ID is missing.' };
  }

  const userProfile = context?.userProfile ?? {};
  const loans = context?.loans ?? [];
  const history: Message[] = context?.history ?? [];

  // 4. Call the AI with the loans and history using OpenRouter
  try {
    const systemPrompt = `You are LoanZen's AI advisor. Be concise, friendly, and practical. Use the user's real data.

User profile (JSON):\n${JSON.stringify({
  displayName: (userProfile as any)?.displayName ?? null,
  subscriptionStatus: (userProfile as any)?.subscriptionStatus ?? null,
  trialEnds: (userProfile as any)?.trialEnds ?? null,
  createdAt: (userProfile as any)?.createdAt ?? null,
})}

User loans with recent payments (JSON):\n${JSON.stringify(loans)}

Guidelines:\n- If user asks for payoff plans, compare avalanche (highest APR first) vs snowball (lowest balance first) using their balances and rates.\n- Show brief calculations when recommending steps (e.g., interest per month, savings).\n- Use recent payments to infer behavior and momentum; praise consistency and suggest improvements.\n- If data seems missing or ambiguous, ask one short clarifying question.\n- Keep answers under 200 words unless user asks for more.\n- When giving amounts, format as currency when appropriate.`;

    const orMessages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: messageContent },
    ] as any;

    // Note: model slug may need adjustment to the exact OpenRouter model identifier
    const model = process.env.OPENROUTER_MODEL || 'TNG: DeepSeek R1T2 Chimera';
    const reply = await openRouterChat(orMessages, model);
    
    return { type: 'success', data: { content: reply } };
  } catch (error) {
    console.error("AI Advisor Action Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected AI error occurred.';
    return { type: 'error', error: errorMessage };
  }
}

// Action to get or create a chat session for the user
export async function getOrCreateChatAction(userId: string): Promise<{ chatId: string | null; error?: string }> {
    if (!userId) return { chatId: null, error: 'User not authenticated.' };
    // Do not perform server-side Firestore reads/writes to satisfy security rules
    // The client will write to the messages subcollection directly as needed
    return { chatId: 'default' };
}
