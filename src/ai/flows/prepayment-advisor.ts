// src/ai/flows/prepayment-advisor.ts
'use server';
/**
 * @fileOverview A prepayment advisor AI agent.
 *
 * - getPrepaymentAdvice - A function that handles the prepayment advice process.
 * - PrepaymentAdvisorInput - The input type for the getPrepaymentAdvice function.
 * - PrepaymentAdvisorOutput - The return type for the getPrepaymentAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrepaymentAdvisorInputSchema = z.object({
  income: z
    .number()
    .describe('The user monthly income after taxes and other deductions'),
  loans: z.array(
    z.object({
      loanName: z.string().describe('The human-readable name of the loan.'),
      outstandingBalance: z.number().describe('The outstanding balance of the loan.'),
      interestRate: z.number().describe('The interest rate of the loan.'),
      minimumPayment: z.number().describe('The minimum monthly payment for the loan.'),
    })
  ).describe('An array of loans the user has.'),
  savingsOpportunities: z.array(
    z.object({
      opportunityName: z.string().describe('The name of the savings opportunity.'),
      amount: z.number().describe('The amount of savings available.'),
      startDate: z.string().describe('The start date of the savings opportunity (YYYY-MM-DD).'),
    })
  ).optional().describe('An array of savings opportunities the user has.'),
  debtManagementTechniques: z.array(
    z.object({
      techniqueName: z.string().describe('The name of the debt management technique.'),
      description: z.string().describe('The description of the debt management technique.'),
    })
  ).optional().describe('An array of debt management techniques the user is considering.'),
});
export type PrepaymentAdvisorInput = z.infer<typeof PrepaymentAdvisorInputSchema>;

const PrepaymentAdvisorOutputSchema = z.object({
  advice: z.string().describe('The advice on the user\'s optimal repayment strategy.'),
});
export type PrepaymentAdvisorOutput = z.infer<typeof PrepaymentAdvisorOutputSchema>;

export async function getPrepaymentAdvice(input: PrepaymentAdvisorInput): Promise<PrepaymentAdvisorOutput> {
  return prepaymentAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prepaymentAdvisorPrompt',
  input: {schema: PrepaymentAdvisorInputSchema},
  output: {schema: PrepaymentAdvisorOutputSchema},
  prompt: `You are a financial advisor specializing in debt repayment strategies.

You will analyze the user's income, loans, savings opportunities, and debt management techniques to recommend an optimal repayment strategy.

Income: {{{income}}}
Loans: {{#each loans}}{{{loanName}}}: Outstanding Balance: {{{outstandingBalance}}}, Interest Rate: {{{interestRate}}}, Minimum Payment: {{{minimumPayment}}}
{{/each}}

{{#if savingsOpportunities}}
Savings Opportunities: {{#each savingsOpportunities}}{{{opportunityName}}}: {{{amount}}}, Start Date: {{{startDate}}}
{{/each}}
{{/if}}

{{#if debtManagementTechniques}}
Debt Management Techniques: {{#each debtManagementTechniques}}{{{techniqueName}}}: {{{description}}}
{{/each}}
{{/if}}

Consider the following strategies:
- Debt Avalanche: Prioritize paying off loans with the highest interest rates first.
- Debt Snowball: Prioritize paying off loans with the smallest balances first.
- Consider incorporating savings opportunities to accelerate debt payoff.
- Evaluate the debt management techniques the user is considering.

Based on this information, provide a detailed repayment strategy that minimizes interest paid and accelerates debt payoff.
`, 
});

const prepaymentAdvisorFlow = ai.defineFlow(
  {
    name: 'prepaymentAdvisorFlow',
    inputSchema: PrepaymentAdvisorInputSchema,
    outputSchema: PrepaymentAdvisorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
