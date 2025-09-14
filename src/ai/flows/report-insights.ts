'use server';
/**
 * @fileOverview An AI agent for generating report insights.
 *
 * - getReportInsights - A function that generates a personalized action plan.
 * - ReportInsightsInput - The input type for the getReportInsights function.
 * - ReportInsightsOutput - The return type for the getReportInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WhatIfScenarioSchema = z.object({
  name: z.string().describe('The name of the what-if scenario (e.g., "+ $100/mo").'),
  monthsSaved: z.number().describe('How many months the user would save.'),
  interestSaved: z.number().describe('How much interest in dollars the user would save.'),
});

const ReportInsightsInputSchema = z.object({
  loanType: z.enum(['new-loan', 'existing-loan']),
  projectedPayoffDate: z.string().optional().describe('The projected payoff date of the loan.'),
  bestScenarioName: z.string().optional().describe('The name of the best loan scenario for a new loan.'),
  savingsComparedToWorst: z.number().optional().describe('The total savings if the user chooses the best new loan scenario over the worst.'),
  whatIfScenarios: z.array(WhatIfScenarioSchema).describe('An array of what-if scenarios showing the impact of extra payments.'),
});
export type ReportInsightsInput = z.infer<typeof ReportInsightsInputSchema>;

const ReportInsightsOutputSchema = z.object({
  actionPlan: z.array(z.string()).describe('A list of 2-3 bullet points for the user\'s recommended action plan.'),
});
export type ReportInsightsOutput = z.infer<typeof ReportInsightsOutputSchema>;

export async function getReportInsights(input: ReportInsightsInput): Promise<ReportInsightsOutput> {
  return reportInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reportInsightsPrompt',
  input: { schema: ReportInsightsInputSchema },
  output: { schema: ReportInsightsOutputSchema },
  prompt: `You are a helpful and concise financial advisor. Your task is to generate a short, actionable "Recommended Action Plan" for a user's loan report.
Generate 2-3 bullet points based on the provided data. Be encouraging and focus on the positive impact of their choices or potential actions.

- If the loanType is 'existing-loan', use the projectedPayoffDate and the whatIfScenarios to form the advice.
- If the loanType is 'new-loan', use the bestScenarioName, savingsComparedToWorst, and the whatIfScenarios.
- For what-if scenarios, pick the most impactful one (e.g., the one that saves the most money or time) to highlight.
- Keep each bullet point to a single sentence.
- Do not use markdown formatting like ** or *. Just return the plain text for each bullet point.

## Loan Data

Loan Type: {{{loanType}}}

{{#if projectedPayoffDate}}
Projected Payoff Date: {{{projectedPayoffDate}}}
{{/if}}

{{#if bestScenarioName}}
Recommended Scenario: {{{bestScenarioName}}}
Potential Savings: {{{savingsComparedToWorst}}}
{{/if}}

## What-If Scenarios
{{#each whatIfScenarios}}
- Scenario: "{{name}}" saves {{{monthsSaved}}} months and {{{interestSaved}}} dollars.
{{/each}}
`,
});

const reportInsightsFlow = ai.defineFlow(
  {
    name: 'reportInsightsFlow',
    inputSchema: ReportInsightsInputSchema,
    outputSchema: ReportInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
