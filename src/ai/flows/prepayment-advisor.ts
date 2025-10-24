// src/ai/flows/prepayment-advisor.ts
'use server';
/**
 * @fileOverview A prepayment advisor AI agent that provides conversational advice.
 *
 * - getPrepaymentAdvice - A function that handles the prepayment advice process.
 * - PrepaymentAdvisorInput - The input type for the getPrepaymentAdvice function.
 * - PrepaymentAdvisorOutput - The return type for the getPrepaymentAdvice function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const PrepaymentAdvisorInputSchema = z.object({
  loans: z.array(
    z.object({
      loanName: z.string().describe('The human-readable name of the loan.'),
      currentBalance: z.number().describe('The outstanding balance of the loan.'),
      interestRate: z.number().describe('The interest rate of the loan.'),
      monthlyPayment: z.number().describe('The minimum monthly payment for the loan.'),
    })
  ).describe('An array of the user\'s current loans.'),
  history: z.array(MessageSchema).describe("The conversation history."),
});
export type PrepaymentAdvisorInput = z.infer<typeof PrepaymentAdvisorInputSchema>;

const PrepaymentAdvisorOutputSchema = z.object({
  content: z.string().describe("The AI's response to the user."),
});
export type PrepaymentAdvisorOutput = z.infer<typeof PrepaymentAdvisorOutputSchema>;


export async function getPrepaymentAdvice(input: PrepaymentAdvisorInput): Promise<PrepaymentAdvisorOutput> {
  return prepaymentAdvisorFlow(input);
}


const prompt = ai.definePrompt({
  name: 'prepaymentAdvisorPrompt',
  input: { schema: PrepaymentAdvisorInputSchema },
  output: { schema: PrepaymentAdvisorOutputSchema },
  prompt: `You are a friendly and expert financial advisor specializing in debt repayment strategies for LoanZen. Your goal is to provide clear, actionable advice to help users manage and pay off their loans faster.

You have access to the user's current loan information and the ongoing conversation history.

CURRENT LOAN INFORMATION:
{{#if loans}}
{{#each loans}}
- {{loanName}}:
  - Current Balance: \${{currentBalance}}
  - Interest Rate: {{interestRate}}%
  - Monthly Payment: \${{monthlyPayment}}
{{/each}}
{{else}}
The user has not provided any loan information.
{{/if}}

CONVERSATION HISTORY:
{{#each history}}
- {{role}}: {{content}}
{{/each}}

Based on the full context of the user's loans and the conversation history, provide a helpful and relevant response to the user's last message. Be conversational and empathetic. If the user asks a question, answer it. If they are looking for a strategy, analyze their loans and suggest one, like the debt avalanche (paying off highest interest rate first) or debt snowball (paying off lowest balance first) methods.

Keep your responses concise and easy to understand.
`,
});


const prepaymentAdvisorFlow = ai.defineFlow(
  {
    name: 'prepaymentAdvisorFlow',
    inputSchema: PrepaymentAdvisorInputSchema,
    outputSchema: PrepaymentAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return { content: "I'm sorry, I couldn't process that request. Could you try rephrasing?" };
    }
    return output;
  }
);
