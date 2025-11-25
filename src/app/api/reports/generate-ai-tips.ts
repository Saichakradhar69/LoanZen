'use server';

import { callOpenRouter, ORMessage } from '@/ai/openrouter';
import type { CalculationResults, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';

export interface AITips {
  keyRecommendations: string[];
  prepaymentStrategy: {
    recommendation: string;
    monthlyExtra?: number;
    lumpSum?: number;
    savings?: number;
    monthsSaved?: number;
  };
  riskAnalysis: string[];
  actionItems: string[];
  refinancingOpportunity?: string;
  insights?: string[];
}

export async function generateReportTips(reportData: CalculationResults): Promise<AITips> {
  try {
    let systemPrompt = '';
    let userPrompt = '';

    if (reportData.formType === 'new-loan') {
      const data = reportData as NewLoanCalculationResults;
      const bestScenario = [...data.scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0];
      const worstScenario = data.scenarios.length > 1 
        ? [...data.scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0] 
        : bestScenario;
      const savings = worstScenario.totalInterest - bestScenario.totalInterest;

      systemPrompt = `You are LoanZen's AI financial advisor. Analyze loan scenarios in detail and provide highly specific, personalized, and actionable recommendations. Use the exact numbers provided. Calculate specific savings amounts. Be direct and practical. Avoid generic advice.`;

      // Calculate specific metrics for better recommendations
      const interestToPrincipalRatio = bestScenario.totalInterest / bestScenario.loanAmount;
      const monthlyInterestCost = (bestScenario.loanAmount * bestScenario.interestRate / 100) / 12;
      const effectiveRate = (bestScenario.totalInterest / bestScenario.loanAmount / bestScenario.loanTerm) * 100;
      const recommendedExtra = Math.max(50, Math.round(bestScenario.monthlyPayment * 0.05 / 10) * 10); // Round to nearest 10

      userPrompt = `Analyze this loan comparison in detail and provide SPECIFIC, PERSONALIZED recommendations:

LOAN DETAILS:
- Loan Type: ${data.loanType || 'Not specified'}
- Number of Options: ${data.scenarios.length}

BEST OPTION (${bestScenario.scenarioName}):
- Loan Amount: ${bestScenario.loanAmount}
- Interest Rate: ${bestScenario.interestRate}% per annum
- Loan Term: ${bestScenario.loanTerm} years (${bestScenario.loanTerm * 12} months)
- Monthly Payment (EMI): ${bestScenario.monthlyPayment}
- Total Interest Over Life: ${bestScenario.totalInterest}
- Total Cost (Principal + Interest): ${bestScenario.totalPayment}
- Interest-to-Principal Ratio: ${(interestToPrincipalRatio * 100).toFixed(1)}%
- Monthly Interest Cost (First Month): ~${monthlyInterestCost.toFixed(2)}
- Effective Annual Cost Rate: ~${effectiveRate.toFixed(2)}%

${data.scenarios.length > 1 ? `COMPARISON:
- Alternative Option: ${worstScenario.scenarioName} @ ${worstScenario.interestRate}%
- Total Cost of Alternative: ${worstScenario.totalPayment}
- Money Saved by Choosing Best: ${savings}
- Percentage Savings: ${((savings / worstScenario.totalPayment) * 100).toFixed(1)}%` : ''}

AMORTIZATION INSIGHTS:
- First Year Interest: ~${bestScenario.amortizationSchedule.slice(0, 12).reduce((sum, p) => sum + p.interest, 0).toFixed(2)}
- First Year Principal: ~${bestScenario.amortizationSchedule.slice(0, 12).reduce((sum, p) => sum + p.principal, 0).toFixed(2)}
- Last Year Interest: ~${bestScenario.amortizationSchedule.slice(-12).reduce((sum, p) => sum + p.interest, 0).toFixed(2)}

Provide HIGHLY SPECIFIC recommendations:

1. Key Recommendations (3-5): 
   - Be specific: "Choose ${bestScenario.scenarioName} because it saves ${savings} compared to alternatives" 
   - Include exact numbers and calculations
   - Reference the loan type specifics (e.g., if education loan, mention moratorium considerations)

2. Prepayment Strategy:
   - Calculate exact recommended extra payment: suggest ${recommendedExtra} or ${Math.round(bestScenario.monthlyPayment * 0.1 / 10) * 10} per month
   - Calculate exact savings: if paying extra ${recommendedExtra}/month, how much interest saved?
   - Calculate exact time saved: how many months earlier will loan be paid off?

3. Risk Analysis:
   - Specific to this loan type and rate
   - What happens if interest rate increases by 1%? 2%?
   - What if monthly payment becomes difficult?
   - Loan-type-specific risks (e.g., education loan moratorium, variable rates)

4. Action Items (3-5):
   - Specific next steps with exact amounts
   - Timeline for actions
   - Loan-type-specific actions

5. Insights:
   - Specific observations about this loan (e.g., "You'll pay ${((bestScenario.totalInterest / bestScenario.loanAmount) * 100).toFixed(0)}% of loan amount in interest")
   - Loan-type-specific insights

Format as JSON:
{
  "keyRecommendations": ["Specific rec with numbers", ...],
  "prepaymentStrategy": {
    "recommendation": "Specific strategy with calculations",
    "monthlyExtra": ${recommendedExtra},
    "savings": calculated_savings_amount,
    "monthsSaved": calculated_months
  },
  "riskAnalysis": ["Specific risk with impact", ...],
  "actionItems": ["Specific action with timeline", ...],
  "insights": ["Specific insight with numbers", ...]
}`;

    } else {
      const data = reportData as ExistingLoanReportResults;
      const paidPercentage = data.originalLoanAmount > 0 
        ? ((data.originalLoanAmount - data.outstandingBalance) / data.originalLoanAmount) * 100 
        : 0;
      const totalPaid = data.originalLoanAmount - data.outstandingBalance;
      const remainingMonths = data.projectedTotalInterest > 0 
        ? Math.ceil((data.outstandingBalance / (data.emiAmount || data.outstandingBalance / 120)) / 12)
        : 0;

      systemPrompt = `You are LoanZen's AI financial advisor. Analyze existing loan data in detail and provide highly specific, personalized, and actionable recommendations. Use exact numbers from the loan data. Calculate specific savings. Analyze payment patterns. Be direct and practical. Avoid generic advice.`;

      // Calculate base monthly payment
      const baseMonthlyPayment = data.emiAmount && data.emiAmount > 0 
        ? data.emiAmount
        : (data.schedule.length > 0 
          ? [...data.schedule].reverse().find(s => s.type === 'repayment')?.amount || (data.outstandingBalance > 0 ? data.outstandingBalance / 120 : data.originalLoanAmount / 120)
          : (data.outstandingBalance > 0 ? data.outstandingBalance / 120 : data.originalLoanAmount / 120));

      // Analyze payment patterns from schedule
      const repayments = data.schedule.filter(t => t.type === 'repayment');
      const missedPayments = data.schedule.filter(t => t.note?.includes('Missed')).length;
      const averagePayment = repayments.length > 0 
        ? repayments.reduce((sum, t) => sum + t.amount, 0) / repayments.length 
        : baseMonthlyPayment;
      const totalRepaid = repayments.reduce((sum, t) => sum + t.amount, 0);
      const monthsSinceStart = Math.ceil((new Date().getTime() - new Date(data.schedule[0]?.date || data.generatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
      const paymentConsistency = repayments.length > 0 ? (repayments.length / Math.max(1, monthsSinceStart)) * 100 : 0;
      
      // Calculate specific prepayment recommendations
      const recommendedExtra = baseMonthlyPayment > 0 
        ? Math.max(50, Math.round(baseMonthlyPayment * 0.05 / 10) * 10) 
        : Math.round(data.outstandingBalance * 0.001);
      const monthlyInterestCost = (data.outstandingBalance * data.interestRate / 100) / 12;
      const interestRatio = data.outstandingBalance > 0 ? (data.interestRate / 100) / 12 : 0;
      const monthsToPayoff = data.outstandingBalance > 0 && baseMonthlyPayment > monthlyInterestCost
        ? Math.ceil(-Math.log(1 - (data.outstandingBalance * interestRatio) / baseMonthlyPayment) / Math.log(1 + interestRatio))
        : 0;
      const remainingInterest = data.projectedTotalInterest - data.interestPaidToDate;

      // Loan type specific details
      const loanTypeDetails: string[] = [];
      if (data.loanType === 'education') {
        loanTypeDetails.push(`Education Loan with ${data.moratoriumPeriod || 0} months moratorium`);
        if (data.moratoriumInterestType) {
          loanTypeDetails.push(`Moratorium Interest Type: ${data.moratoriumInterestType}`);
        }
        if (data.moratoriumPaymentAmount) {
          loanTypeDetails.push(`Moratorium Payment: ${data.moratoriumPaymentAmount}`);
        }
        if (data.disbursements && data.disbursements.length > 1) {
          loanTypeDetails.push(`Multiple disbursements: ${data.disbursements.length} installments`);
        }
      }
      if (data.rateType === 'floating') {
        loanTypeDetails.push('Variable/Floating interest rate - rates can change');
      }
      if (data.missedEmis && data.missedEmis > 0) {
        loanTypeDetails.push(`${data.missedEmis} missed EMI(s) recorded`);
      }

      userPrompt = `Analyze this EXISTING LOAN in detail and provide HIGHLY SPECIFIC, PERSONALIZED recommendations:

LOAN IDENTITY:
- Loan Name: "${data.loanName || 'Your Loan'}"
- Loan Type: ${data.loanType || 'Not specified'} ${loanTypeDetails.length > 0 ? `(${loanTypeDetails.join(', ')})` : ''}
- Interest Type: ${data.interestType || 'reducing'}
- Rate Type: ${data.rateType || 'fixed'}

FINANCIAL STATUS:
- Original Loan Amount: ${data.originalLoanAmount}
- Current Outstanding Balance: ${data.outstandingBalance}
- Principal Paid: ${totalPaid} (${paidPercentage.toFixed(1)}% of original)
- Interest Paid to Date: ${data.interestPaidToDate}
- Remaining Interest (Projected): ${remainingInterest.toFixed(2)}
- Total Projected Interest: ${data.projectedTotalInterest}
- Current Interest Rate: ${data.interestRate}% per annum
- Monthly Payment (EMI): ${baseMonthlyPayment > 0 ? baseMonthlyPayment : 'Not specified'}
- Per Day Interest Cost: ${data.perDayInterest}
- Monthly Interest Cost (Current): ~${monthlyInterestCost.toFixed(2)}
- Next Payment Due: ${data.nextEmiDate ? new Date(data.nextEmiDate).toLocaleDateString() : 'Not specified'}

PAYMENT PERFORMANCE:
- Total Transactions: ${data.schedule.length}
- Repayments Made: ${repayments.length}
- Missed Payments: ${missedPayments}
- Average Payment Amount: ${averagePayment.toFixed(2)}
- Total Repaid: ${totalRepaid.toFixed(2)}
- Payment Consistency: ${paymentConsistency.toFixed(0)}%
- Months Since Loan Start: ~${monthsSinceStart}

PAYOFF PROJECTION:
- Estimated Months to Payoff: ${monthsToPayoff > 0 ? monthsToPayoff : 'N/A'}
- Estimated Payoff Date: ${monthsToPayoff > 0 ? new Date(Date.now() + monthsToPayoff * 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'N/A'}

Provide HIGHLY SPECIFIC recommendations:

1. Key Recommendations (3-5):
   - Reference exact numbers: "With ${data.outstandingBalance} remaining, paying extra ${recommendedExtra}/month will save approximately X"
   - Loan-type-specific advice (e.g., if education loan in moratorium, specific moratorium strategy)
   - Reference payment history: "You've paid ${paidPercentage.toFixed(1)}% - focus on..."
   - Specific amounts and timelines

2. Prepayment Strategy:
   - Calculate exact recommended extra: ${recommendedExtra} or ${Math.round(baseMonthlyPayment * 0.1 / 10) * 10} per month
   - Calculate exact savings: If paying ${recommendedExtra}/month extra, save approximately X in interest
   - Calculate exact time saved: Pay off ${monthsToPayoff > 0 ? monthsToPayoff : 'X'} months earlier
   - Lump sum recommendation: If making one-time payment of X, save Y

3. Risk Analysis:
   - Specific to current situation: "At ${data.interestRate}% rate, you're paying ${monthlyInterestCost.toFixed(2)}/month in interest"
   - If variable rate: "If rate increases 1%, your monthly interest will increase to X"
   - Payment risk: "Missing one payment costs approximately X in additional interest"
   - Loan-type-specific risks

4. Refinancing Opportunity:
   - Calculate break-even: "You'd need a rate below X% to make refinancing worthwhile"
   - Consider remaining balance: "With ${data.outstandingBalance} remaining, refinancing may/may not make sense because..."
   - Consider fees: "Refinancing fees of X would require Y months to break even"

5. Action Items (3-5):
   - Specific actions with exact amounts: "Pay ${recommendedExtra} extra this month to save X"
   - Timeline: "Within next 30 days, do X"
   - Loan-type-specific actions

6. Insights:
   - Specific observations: "You've already paid ${data.interestPaidToDate} in interest, which is ${((data.interestPaidToDate / data.originalLoanAmount) * 100).toFixed(1)}% of your original loan"
   - Payment pattern insights: "Your payment consistency is ${paymentConsistency.toFixed(0)}% - ${paymentConsistency > 80 ? 'excellent' : paymentConsistency > 60 ? 'good' : 'needs improvement'}"
   - Loan-type-specific insights

Format as JSON:
{
  "keyRecommendations": ["Specific rec with exact numbers and calculations", ...],
  "prepaymentStrategy": {
    "recommendation": "Detailed strategy with specific calculations",
    "monthlyExtra": ${recommendedExtra},
    "lumpSum": ${Math.round(data.outstandingBalance * 0.01 / 10) * 10},
    "savings": calculated_exact_savings,
    "monthsSaved": calculated_exact_months
  },
  "riskAnalysis": ["Specific risk with exact impact calculations", ...],
  "actionItems": ["Specific action with exact amounts and timeline", ...],
  "refinancingOpportunity": "Detailed analysis with break-even calculations",
  "insights": ["Specific insight with exact numbers", ...]
}`;
    }

    const messages: ORMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const aiResponse = await callOpenRouter(messages);
    
    // Try to parse JSON from the response
    let tips: AITips;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || aiResponse.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      tips = JSON.parse(jsonString);
    } catch (parseError) {
      // Fallback: create structured tips from text response
      const lines = aiResponse.split('\n').filter(l => l.trim());
      tips = {
        keyRecommendations: lines.slice(0, 5).filter(l => l.match(/^[-•\d]/)),
        prepaymentStrategy: {
          recommendation: lines.find(l => l.toLowerCase().includes('prepay') || l.toLowerCase().includes('extra')) || 'Consider making extra payments to reduce interest.',
        },
        riskAnalysis: lines.filter(l => l.toLowerCase().includes('risk') || l.toLowerCase().includes('warning')),
        actionItems: lines.filter(l => l.match(/^[-•\d]/)).slice(0, 5),
        insights: lines.slice(0, 3),
      };
    }

    // Ensure all required fields exist
    // Handle refinancingOpportunity - convert object to string if needed
    let refinancingOpportunity: string | undefined;
    if (tips.refinancingOpportunity) {
      if (typeof tips.refinancingOpportunity === 'string') {
        refinancingOpportunity = tips.refinancingOpportunity;
      } else if (typeof tips.refinancingOpportunity === 'object') {
        // Convert object to readable string
        const obj = tips.refinancingOpportunity as any;
        if (obj.analysis) {
          refinancingOpportunity = obj.analysis;
          if (obj.breakEvenRate) {
            refinancingOpportunity += ` Break-even rate: ${obj.breakEvenRate}%.`;
          }
          if (obj.breakEvenMonths) {
            refinancingOpportunity += ` Break-even period: ${obj.breakEvenMonths} months.`;
          }
        } else {
          // Fallback: stringify the object
          refinancingOpportunity = JSON.stringify(tips.refinancingOpportunity);
        }
      }
    }

    return {
      keyRecommendations: tips.keyRecommendations || [],
      prepaymentStrategy: tips.prepaymentStrategy || { recommendation: 'Consider making extra payments to reduce interest.' },
      riskAnalysis: tips.riskAnalysis || [],
      actionItems: tips.actionItems || [],
      refinancingOpportunity,
      insights: tips.insights || [],
    };

  } catch (error) {
    console.error('Failed to generate AI tips:', error);
    // Return default tips on error
    return {
      keyRecommendations: [
        'Review your loan terms carefully and ensure you understand all fees and conditions.',
        'Consider making extra payments when possible to reduce total interest paid.',
        'Set up automatic payments to avoid late fees and maintain good credit.',
      ],
      prepaymentStrategy: {
        recommendation: 'Making extra payments can significantly reduce your total interest. Even small amounts add up over time.',
      },
      riskAnalysis: [
        'Interest rates may change if you have a variable rate loan.',
        'Missing payments can result in late fees and damage to your credit score.',
      ],
      actionItems: [
        'Review your budget to identify opportunities for extra payments.',
        'Set up payment reminders to avoid missed payments.',
        'Monitor your loan balance regularly to track progress.',
      ],
    };
  }
}

