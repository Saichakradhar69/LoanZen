

'use client'

import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Line, ComposedChart, Area, LabelList } from 'recharts';
import type { CalculationResults as ReportDataType, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';
import { Banknote, CalendarCheck, Check, Gift, Lightbulb, TrendingUp } from 'lucide-react';
import Logo from '@/components/logo';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/contexts/currency-context';
import { LOANZEN_TRIAL_COUPON_CODE } from '@/lib/coupon-code';
import type { AITips } from '@/app/api/reports/generate-ai-tips';


interface ReportTemplateProps {
  reportData: ReportDataType;
}

const loanTypeLabels: { [key: string]: string } = {
  home: 'Home Loan',
  car: 'Car Loan',
  personal: 'Personal Loan',
  education: 'Education Loan',
  custom: 'Custom Loan',
  'credit-line': 'Credit Line',
  other: 'Other',
};

// Helper function for what-if scenarios
function calculateWhatIf(
    principal: number,
    monthlyPayment: number,
    annualRate: number,
    baseMonths: number,
    baseInterest: number,
    extraMonthly: number = 0,
    lumpSum: number = 0
) {
    const principalInCents = Math.round(principal * 100);
    const monthlyPaymentInCents = Math.round(monthlyPayment * 100);
    const extraMonthlyInCents = Math.round(extraMonthly * 100);
    const lumpSumInCents = Math.round(lumpSum * 100);
    const baseInterestInCents = Math.round(baseInterest * 100);

    if (principalInCents <= 0) {
        return { months: 0, totalInterest: 0, years: 0, monthsSaved: baseMonths, interestSaved: baseInterest };
    }
    const monthlyRate = annualRate / 100 / 12;
    let balanceInCents = principalInCents - lumpSumInCents;
    let months = 0;
    let totalInterestInCents = 0;

    const fullPaymentInCents = monthlyPaymentInCents + extraMonthlyInCents;

    if (lumpSumInCents > 0 && balanceInCents <= 0) { // Paid off with lump sum
         return { months: 0, totalInterest: 0, years: 0, monthsSaved: baseMonths, interestSaved: baseInterest };
    }
    
    // If the monthly payment is less than or equal to the interest, it will never be paid off.
    if (fullPaymentInCents <= Math.round(balanceInCents * monthlyRate)) {
        return { months: Infinity, totalInterest: Infinity, years: Infinity, monthsSaved: 0, interestSaved: 0 };
    }


    while (balanceInCents > 0) {
        const interestInCents = Math.round(balanceInCents * monthlyRate);
        const principalPaidInCents = fullPaymentInCents - interestInCents;

        balanceInCents -= principalPaidInCents;
        totalInterestInCents += interestInCents;
        months++;
        if (months > 1200) return { months: Infinity, totalInterest: Infinity, years: Infinity, monthsSaved: 0, interestSaved: 0 }; // Safety break
    }

    const totalInterest = totalInterestInCents / 100;
    const years = months / 12;
    const monthsSaved = baseMonths - months;
    const interestSaved = (baseInterestInCents - totalInterestInCents) / 100;

    return { months, totalInterest, years, monthsSaved, interestSaved };
}



const ProgressRing = ({ progress }: { progress: number }) => {
    const strokeWidth = 10;
    const radius = 60;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="-rotate-90"
            >
                <circle
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    className="text-green-500"
                    stroke="currentColor"
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                 <span className="text-3xl font-bold text-gray-700">{`${Math.round(progress)}%`}</span>
                 <span className="text-sm text-gray-500 max-w-[90px] leading-tight">% of Principal Paid</span>
            </div>
        </div>
    );
};

const AmortizationTimelineChart = ({ originalTerm, scenarios }: { originalTerm: number, scenarios: { name: string, months: number }[] }) => {
    // Filter out scenarios with non-finite months or no change
    const validScenarios = scenarios.filter(s => isFinite(s.months) && s.months < originalTerm);

    const data = [{
        name: 'Terms',
        "Original Term": originalTerm,
        ...validScenarios.reduce((acc, s) => ({ ...acc, [s.name]: s.months }), {})
    }];
    
    const bars = [
      { key: "Original Term", fill: "#3F51B5", name: "Current Plan" },
      ...validScenarios.map((s, i) => ({ key: s.name, fill: ['#10B981', '#FFAB40'][i % 2], name: s.name }))
    ];


    return (
        <div className="w-[720px] mx-auto" style={{ display: 'block', visibility: 'visible' }}>
        <ResponsiveContainer width={720} height={150 + (validScenarios.length * 20)}>
            <BarChart data={data} layout="vertical" barCategoryGap="25%" margin={{ left: 30, right: 50 }}>
                <XAxis type="number" domain={[0, dataMax => Math.ceil(dataMax / 12) * 12]} tickFormatter={(val) => `${val / 12}y`} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(value, name) => [`${value} months (${(Number(value)/12).toFixed(1)} years)`, name]} />
                <Legend />
                {bars.map(bar => (
                    <Bar key={bar.key} dataKey={bar.key} fill={bar.fill} name={bar.name}>
                       <LabelList 
                            dataKey={bar.key} 
                            position="right" 
                            offset={8}
                            className="fill-gray-600 font-semibold"
                            formatter={(value: number) => isFinite(value) && value > 0 ? `${value} months` : (value === 0 ? 'Paid Off' : '')}
                        />
                    </Bar>
                ))}
            </BarChart>
        </ResponsiveContainer>
        </div>
    )
}


const NewLoanReport = ({ reportData, formatCurrency, currency, getCurrencyName, aiTips }: { reportData: NewLoanCalculationResults; formatCurrency: (value: number) => string; currency: string; getCurrencyName: () => string; aiTips?: AITips }) => {
    const { scenarios } = reportData;
    const hasMultipleScenarios = scenarios.length > 1;
    const bestScenario = [...scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0];
    const worstScenario = hasMultipleScenarios ? [...scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0] : scenarios[0];
    const savings = worstScenario.totalInterest - bestScenario.totalInterest;

    // --- DYNAMIC WHAT-IF SCENARIOS ---
    const baseMonths = bestScenario.loanTerm * 12;
    const extraPayment5Percent = bestScenario.monthlyPayment * 0.05;
    const extraPayment10Percent = bestScenario.monthlyPayment * 0.10;
    const lumpSum1Percent = bestScenario.loanAmount * 0.01;

    const whatIf5Percent = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, extraPayment5Percent);
    const whatIf10Percent = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, extraPayment10Percent);
    const whatIf1PercentLump = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, 0, lumpSum1Percent);


    const whatIfScenarios = [
      { name: `+ ${formatCurrency(extraPayment5Percent)}/mo (5%)`, months: whatIf5Percent.months},
      { name: `+ ${formatCurrency(extraPayment10Percent)}/mo (10%)`, months: whatIf10Percent.months}
    ].filter(s => isFinite(s.months) && s.months > 0);


    return (
        <>
            {/* Page 2: Executive Summary */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">
                        {hasMultipleScenarios ? "Your Recommended Path" : "Your Loan Health Snapshot"}
                    </h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>
                {hasMultipleScenarios && (
                    <div className="text-center bg-green-50/50 p-4 rounded-lg mb-4">
                        <p className="text-base text-green-800">Based on our analysis, you could save:</p>
                        <p className="text-4xl font-bold text-green-600 my-1">{formatCurrency(savings)}</p>
                        <p className="text-base text-green-800">by choosing the "{bestScenario.scenarioName}" option.</p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasMultipleScenarios && (
                         <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-base font-semibold mb-3 text-center">Winner Comparison</h3>
                            <div className="space-y-2">
                                <div className="p-3 bg-white rounded-md border-2 border-green-500">
                                     <p className="text-sm font-bold flex items-center gap-2"><TrendingUp className="text-green-500 w-4 h-4" /> Best Option: {bestScenario.scenarioName} @ {bestScenario.interestRate}%</p>
                                     <p className="text-lg font-semibold mt-1">Total Cost: {formatCurrency(bestScenario.totalPayment)}</p>
                                </div>
                                 <div className="p-3 bg-white rounded-md border">
                                     <p className="text-sm font-bold flex items-center gap-2"><Banknote className="text-blue-500 w-4 h-4" /> Other Option: {worstScenario.scenarioName} @ {worstScenario.interestRate}%</p>
                                     <p className="text-lg font-semibold mt-1">Total Cost: {formatCurrency(worstScenario.totalPayment)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                         <div className="flex justify-between items-center mb-3">
                             <h3 className="text-base font-semibold text-center flex-1">Key Insights</h3>
                             <span className="text-xs text-gray-500 ml-2">All amounts in {currency}</span>
                         </div>
                         <ul className="space-y-2 text-sm">
                            {hasMultipleScenarios && (
                                <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 mt-0.5 shrink-0" /> <span><strong>Save Big:</strong> Choosing our recommendation saves you <span className="font-bold">{formatCurrency(savings)}</span> in interest.</span></li>
                            )}
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 mt-0.5 shrink-0" /> <span><strong>Monthly Payment:</strong> Your estimated payment for the best option is <span className="font-bold">{formatCurrency(bestScenario.monthlyPayment)}</span>.</span></li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 mt-0.5 shrink-0" /> <span><strong>Loan Term:</strong> You'll be debt-free in <span className="font-bold">{bestScenario.loanTerm}</span> years.</span></li>
                         </ul>
                    </div>
                </div>
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                    <h3 className="text-base font-semibold mb-3 text-center text-blue-800">What-If Scenarios</h3>
                    <p className="text-center text-xs text-blue-700 mb-3">See how you can pay off your loan even faster.</p>
                     <div className="space-y-2 text-center text-sm">
                        {isFinite(whatIf5Percent.months) && whatIf5Percent.monthsSaved > 0 && <p>If you pay an extra <strong>{formatCurrency(extraPayment5Percent)}/month</strong> (5% of EMI), you will be debt-free <strong>{whatIf5Percent.monthsSaved.toFixed(0)} months sooner</strong> and save <strong>{formatCurrency(whatIf5Percent.interestSaved)}</strong> in interest.</p>}
                        {isFinite(whatIf10Percent.months) && whatIf10Percent.monthsSaved > 0 && <p>If you pay an extra <strong>{formatCurrency(extraPayment10Percent)}/month</strong> (10% of EMI), you will be debt-free <strong>{whatIf10Percent.monthsSaved.toFixed(0)} months sooner</strong> and save <strong>{formatCurrency(whatIf10Percent.interestSaved)}</strong> in interest.</p>}
                         {isFinite(whatIf1PercentLump.interestSaved) && whatIf1PercentLump.interestSaved > 0 && <p>If you make a one-time lump-sum payment of <strong>{formatCurrency(lumpSum1Percent)}</strong> (1% of loan), you will save <strong>{formatCurrency(whatIf1PercentLump.interestSaved)}</strong> in interest.</p>}
                    </div>
                </div>
            </div>

            {/* Page 2.5: AI-Powered Recommendations */}
            {aiTips && (
                <>
                    {/* Page 1: Key Recommendations & Prepayment Strategy */}
                    <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'auto' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline flex items-center gap-2">
                                <Lightbulb className="text-yellow-500 w-5 h-5" />
                                AI-Powered Recommendations
                            </h2>
                            <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                <strong>Currency:</strong> {getCurrencyName()}
                            </div>
                        </div>
                        
                        {aiTips.keyRecommendations && aiTips.keyRecommendations.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xl font-semibold mb-3 text-blue-800">Key Recommendations</h3>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <ul className="space-y-1.5">
                                        {aiTips.keyRecommendations.map((rec, idx) => (
                                            <li key={idx} className="flex gap-2">
                                                <Check className="text-green-500 w-4 h-4 mt-0.5 shrink-0" />
                                                <span className="text-gray-700 text-xs">{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {aiTips.prepaymentStrategy && (
                            <div className="mb-4">
                                <h3 className="text-xl font-semibold mb-3 text-green-800">Prepayment Strategy</h3>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <p className="text-gray-700 mb-3 text-xs">{aiTips.prepaymentStrategy.recommendation}</p>
                                    {aiTips.prepaymentStrategy.monthlyExtra && (
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div className="bg-white p-3 rounded border">
                                                <p className="text-xs text-gray-500">Recommended Monthly Extra</p>
                                                <p className="text-lg font-bold text-green-600">{formatCurrency(aiTips.prepaymentStrategy.monthlyExtra)}</p>
                                            </div>
                                            {aiTips.prepaymentStrategy.savings && (
                                                <div className="bg-white p-3 rounded border">
                                                    <p className="text-xs text-gray-500">Potential Savings</p>
                                                    <p className="text-lg font-bold text-green-600">{formatCurrency(aiTips.prepaymentStrategy.savings)}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Page 2: Risk Analysis & Action Items */}
                    {(aiTips.riskAnalysis && aiTips.riskAnalysis.length > 0) || (aiTips.actionItems && aiTips.actionItems.length > 0) || (aiTips.insights && aiTips.insights.length > 0) ? (
                        <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box', pageBreakAfter: 'auto' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline flex items-center gap-2">
                                    <Lightbulb className="text-yellow-500 w-5 h-5" />
                                    AI-Powered Recommendations (Continued)
                                </h2>
                                <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    <strong>Currency:</strong> {getCurrencyName()}
                                </div>
                            </div>

                            {aiTips.riskAnalysis && aiTips.riskAnalysis.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-3 text-orange-800">Risk Analysis</h3>
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                        <ul className="space-y-1.5">
                                            {aiTips.riskAnalysis.map((risk, idx) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="text-orange-600 font-bold">⚠</span>
                                                    <span className="text-gray-700 text-xs">{risk}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {aiTips.actionItems && aiTips.actionItems.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-3 text-purple-800">Prioritized Action Items</h3>
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <ol className="space-y-1.5 list-decimal list-inside">
                                            {aiTips.actionItems.map((action, idx) => {
                                                // Handle both string and object formats
                                                const actionText = typeof action === 'string' 
                                                    ? action 
                                                    : (action as any)?.action || (action as any)?.text || JSON.stringify(action);
                                                const timeline = typeof action === 'object' && (action as any)?.timeline 
                                                    ? ` (${(action as any).timeline})` 
                                                    : '';
                                                return (
                                                    <li key={idx} className="text-gray-700 text-xs">
                                                        {actionText}{timeline}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {aiTips.insights && aiTips.insights.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-teal-800">Additional Insights</h3>
                                    <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                                        <ul className="space-y-1.5">
                                            {aiTips.insights.map((insight, idx) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="text-teal-600 font-bold">💡</span>
                                                    <span className="text-gray-700 text-xs">{insight}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </>
            )}

            {/* Page 3: Visual Comparison */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Visual Breakdown of Your Options</h2>
                  <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      <strong>Currency:</strong> {getCurrencyName()}
                  </div>
              </div>
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-center mb-3">Paydown Timeline</h3>
                    <div className="w-[720px] mx-auto" style={{ display: 'block', visibility: 'visible' }}>
                        <ResponsiveContainer width={720} height={300}>
                            <ComposedChart data={bestScenario.amortizationSchedule.filter(a => a.month % 12 === 0 || a.month === 1).map(a => ({ year: Math.floor(a.month / 12), balance: a.remainingBalance }))} margin={{ top: 5, right: 30, left: 50, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -10 }} />
                                <YAxis tickFormatter={(val) => formatCurrency(val as number)}/>
                                <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                                <Legend />
                                <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke='#10B981' fillOpacity={1} fill="url(#colorBalance)" />
                                <Line type="monotone" dataKey="balance" stroke='#10B981' strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Page 3.5: Detailed Amortization Schedule (First 24 Months) */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Detailed Amortization Schedule</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">First 24 months of payments (Best Scenario: {bestScenario.scenarioName})</p>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                            <tr className="bg-blue-900 text-white">
                                <th className="border border-gray-300 p-1 text-left">Month</th>
                                <th className="border border-gray-300 p-1 text-right">Payment</th>
                                <th className="border border-gray-300 p-1 text-right">Principal</th>
                                <th className="border border-gray-300 p-1 text-right">Interest</th>
                                <th className="border border-gray-300 p-1 text-right">Remaining Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bestScenario.amortizationSchedule.slice(0, 24).map((row) => (
                                <tr key={row.month} className={row.month % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                    <td className="border border-gray-300 p-1 font-semibold">{row.month}</td>
                                    <td className="border border-gray-300 p-1 text-right">{formatCurrency(row.monthlyPayment)}</td>
                                    <td className="border border-gray-300 p-1 text-right">{formatCurrency(row.principal)}</td>
                                    <td className="border border-gray-300 p-1 text-right">{formatCurrency(row.interest)}</td>
                                    <td className="border border-gray-300 p-1 text-right font-semibold">{formatCurrency(row.remainingBalance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                    <p><strong>Note:</strong> This shows the first 24 months. Full schedule available in CSV download.</p>
                </div>
            </div>

             <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Accelerated Payoff Comparison</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>
                <div className="mt-4">
                     <h3 className="text-xl font-semibold text-center mb-3">Amortization Timeline with Extra Payments</h3>
                      <AmortizationTimelineChart originalTerm={baseMonths} scenarios={whatIfScenarios} />
                 </div>
             </div>

            {/* Year-by-Year Summary */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Year-by-Year Summary</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">Annual breakdown of payments and progress (Best Scenario: {bestScenario.scenarioName})</p>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                            <tr className="bg-blue-900 text-white">
                                <th className="border border-gray-300 p-1 text-left">Year</th>
                                <th className="border border-gray-300 p-1 text-right">Total Paid</th>
                                <th className="border border-gray-300 p-1 text-right">Principal</th>
                                <th className="border border-gray-300 p-1 text-right">Interest</th>
                                <th className="border border-gray-300 p-1 text-right">Ending Balance</th>
                                <th className="border border-gray-300 p-1 text-right">% Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: Math.ceil(bestScenario.loanTerm) }, (_, i) => {
                                const year = i + 1;
                                const yearStart = (year - 1) * 12;
                                const yearEnd = Math.min(year * 12, bestScenario.amortizationSchedule.length);
                                const yearPayments = bestScenario.amortizationSchedule.slice(yearStart, yearEnd);
                                const totalPaid = yearPayments.reduce((sum, p) => sum + p.monthlyPayment, 0);
                                const principalPaid = yearPayments.reduce((sum, p) => sum + p.principal, 0);
                                const interestPaid = yearPayments.reduce((sum, p) => sum + p.interest, 0);
                                const endingBalance = yearPayments.length > 0 ? yearPayments[yearPayments.length - 1].remainingBalance : 0;
                                const percentPaid = bestScenario.loanAmount > 0 ? ((bestScenario.loanAmount - endingBalance) / bestScenario.loanAmount) * 100 : 0;
                                 
                                return (
                                    <tr key={year} className={year % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="border border-gray-300 p-1 font-semibold">Year {year}</td>
                                        <td className="border border-gray-300 p-1 text-right">{formatCurrency(totalPaid)}</td>
                                        <td className="border border-gray-300 p-1 text-right">{formatCurrency(principalPaid)}</td>
                                        <td className="border border-gray-300 p-1 text-right">{formatCurrency(interestPaid)}</td>
                                        <td className="border border-gray-300 p-1 text-right font-semibold">{formatCurrency(endingBalance)}</td>
                                        <td className="border border-gray-300 p-1 text-right">{percentPaid.toFixed(1)}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Calendar (Next 12 Months) */}
            <div className="pdf-page bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-1" style={{ marginBottom: '6px' }}>
                    <h2 className="text-base font-bold text-blue-900 border-b border-blue-800 pb-0.5 font-headline" style={{ fontSize: '16px', paddingBottom: '3px' }}>Payment Calendar</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded" style={{ fontSize: '9px', padding: '2px 5px' }}>
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>
                <p className="text-xs text-gray-600 mb-1" style={{ fontSize: '9px', marginBottom: '6px' }}>Upcoming payment schedule for the next 12 months</p>
                <div className="grid grid-cols-3 gap-1.5 flex-1" style={{ gap: '6px', flex: '1 1 auto', gridAutoRows: '1fr' }}>
                    {bestScenario.amortizationSchedule.slice(0, 12).map((payment, idx) => {
                        const paymentDate = new Date();
                        paymentDate.setMonth(paymentDate.getMonth() + idx);
                        return (
                            <div key={idx} className="bg-gray-50 rounded border border-gray-200 flex flex-col justify-between" style={{ padding: '6px', minHeight: '110px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '3px' }}>
                                    <p className="font-semibold" style={{ fontSize: '10px', lineHeight: '1.1', fontWeight: '600' }}>{paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                                    <p style={{ fontSize: '9px', color: '#6b7280' }}>Payment #{payment.month}</p>
                                </div>
                                <div className="mt-auto" style={{ fontSize: '9px', lineHeight: '1.2' }}>
                                    <p style={{ lineHeight: '1.2', marginBottom: '1px' }}><span style={{ color: '#6b7280' }}>Payment:</span> <span style={{ fontWeight: '700' }}>{formatCurrency(payment.monthlyPayment)}</span></p>
                                    <p style={{ lineHeight: '1.2', marginBottom: '1px' }}><span style={{ color: '#6b7280' }}>Principal:</span> {formatCurrency(payment.principal)}</p>
                                    <p style={{ lineHeight: '1.2', marginBottom: '1px' }}><span style={{ color: '#6b7280' }}>Interest:</span> {formatCurrency(payment.interest)}</p>
                                    <p style={{ borderTop: '1px solid #d1d5db', paddingTop: '1px', marginTop: '1px', lineHeight: '1.2' }}><span style={{ color: '#6b7280' }}>Balance:</span> <span style={{ fontWeight: '600' }}>{formatCurrency(payment.remainingBalance)}</span></p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

             {/* Page 4: Action Plan & Upsell */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <h2 className="text-2xl font-bold font-headline text-primary mb-4">Your Recommended Action Plan</h2>

                <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                     <h3 className="text-base font-bold text-gray-800 mb-3">Based on your report, here are your next steps:</h3>
                    <ul className="space-y-2 text-sm">
                        <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 shrink-0 mt-0.5" /><span>Review your options and select the "{bestScenario.scenarioName}" for the most savings.</span></li>
                         {isFinite(whatIf5Percent.months) && whatIf5Percent.interestSaved > 0 && <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 shrink-0 mt-0.5" /><span>Consider paying an extra <strong>{formatCurrency(extraPayment5Percent)}/month</strong>. This small change will save you <strong>{formatCurrency(whatIf5Percent.interestSaved)}!</strong></span></li>}
                    </ul>
                </div>
                 
                 <div className="text-center mt-auto pt-4">
                     <h3 className="text-xl font-bold font-headline text-primary">From Insight to Action: Stop Calculating and Start Tracking</h3>
                     <p className="text-sm text-gray-600 mt-2 max-w-2xl mx-auto">Track your progress in real-time, get payment reminders, and run unlimited 'what-if' scenarios with your LoanZen Tracker Pro dashboard.</p>
                     
                     <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                        <p className="text-base font-bold">Your exclusive upgrade offer is in your email.</p>
                        <p className="text-sm mt-2">Use your personal code for a <span className="font-extrabold text-green-600">14-DAY FREE TRIAL!</span></p>
                     </div>
                 </div>
             </div>
        </>
     )
}


const ExistingLoanReport = ({ reportData, formatCurrency, currency, getCurrencyName, aiTips }: { reportData: ExistingLoanReportResults; formatCurrency: (value: number) => string; currency: string; getCurrencyName: () => string; aiTips?: AITips }) => {
    const { originalLoanAmount, outstandingBalance, interestPaidToDate, schedule, interestRate, nextEmiDate, perDayInterest, emiAmount, projectedTotalInterest } = reportData;
    const paidAmount = originalLoanAmount - outstandingBalance;
    const paidPercentage = originalLoanAmount > 0 ? (paidAmount / originalLoanAmount) * 100 : 0;
    
    // Prioritize the emiAmount from the form if it exists, otherwise fall back to finding the last repayment.
    const baseMonthlyPayment = emiAmount && emiAmount > 0 
        ? emiAmount
        : [...schedule].reverse().find(s => s.type === 'repayment')?.amount || (outstandingBalance > 0 ? outstandingBalance / 120 : originalLoanAmount / 120);

    const baseScenario = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, 0, 0); // Base case to get months and interest from now
    const totalInterestFromNow = isFinite(baseScenario.totalInterest) ? baseScenario.totalInterest : projectedTotalInterest - interestPaidToDate;
    const totalMonthsFromNow = isFinite(baseScenario.months) ? baseScenario.months : 0;
    
    const projectedPayoffDate = new Date();
    if (isFinite(totalMonthsFromNow)) {
        projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + totalMonthsFromNow);
    }
    
    const firstDisbursement = reportData.schedule.find(t => t.type === 'disbursement');
    const loanStartDate = firstDisbursement ? new Date(firstDisbursement.date) : new Date(reportData.generatedAt);
    
    const loanTenureYears = Math.ceil(totalMonthsFromNow / 12) + Math.floor((new Date().getTime() - loanStartDate.getTime()) / (1000 * 3600 * 24 * 365.25));

    // --- DYNAMIC WHAT-IF SCENARIOS ---
    const extraPayment5Percent = baseMonthlyPayment * 0.05;
    const extraPayment10Percent = baseMonthlyPayment * 0.10;
    const lumpSum1Percent = outstandingBalance * 0.01;

    const whatIf5Percent = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, extraPayment5Percent);
    const whatIf10Percent = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, extraPayment10Percent);
    const whatIf1PercentLump = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 0, lumpSum1Percent);


    const interestPieData = [
        { name: 'Principal Paid', value: paidAmount },
        { name: 'Interest Paid', value: interestPaidToDate },
    ];
    const principalPaidToDate = originalLoanAmount - outstandingBalance;
    
    const whatIfScenarios = [
      { name: `+ ${formatCurrency(extraPayment5Percent)}/mo (5%)`, months: whatIf5Percent.months},
      { name: `+ ${formatCurrency(extraPayment10Percent)}/mo (10%)`, months: whatIf10Percent.months}
    ].filter(s => isFinite(s.months) && s.months > 0);

    // Data for the paydown timeline chart
    const timelineData = schedule.filter(s => s.type === 'disbursement' || s.type === 'repayment' || s.type === 'interest')
        .map(s => ({ date: new Date(s.date).getTime(), balance: s.endingBalance }));

    // Total cost calculation
    const totalProjectedCost = originalLoanAmount + totalInterestFromNow;
    const totalPaidToDate = principalPaidToDate + interestPaidToDate;
    const totalCostProgress = totalProjectedCost > 0 ? (totalPaidToDate / totalProjectedCost) * 100 : 0;

    const disbursements = schedule.filter(t => t.type === 'disbursement');
    const hasMultipleDisbursements = disbursements.length > 1;

    const disbursementChartData = disbursements.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: d.amount,
    })).reverse();


    return (
        <>
            {/* Page 2: Loan Health Dashboard */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Your Loan Health at a Glance</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-2 border-b pb-2 mb-2">
                    <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Loan Type</p>
                        <p className="text-sm font-semibold">{loanTypeLabels[reportData.loanType] || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Original Loan Amount</p>
                        <p className="text-sm font-semibold">{formatCurrency(reportData.originalLoanAmount)}</p>
                    </div>
                     <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Interest Rate</p>
                        <p className="text-sm font-semibold">{reportData.interestRate.toFixed(2)}%</p>
                    </div>
                     <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Loan Tenure</p>
                        <p className="text-sm font-semibold">{loanTenureYears > 0 ? `${loanTenureYears} Years` : 'N/A'}</p>
                    </div>
                     <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Monthly Payment (EMI)</p>
                        <p className="text-sm font-semibold">{baseMonthlyPayment > 0 ? formatCurrency(baseMonthlyPayment) : 'N/A'}</p>
                    </div>
                     <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Loan Period</p>
                        <p className="text-sm font-semibold">{loanStartDate.toLocaleDateString()} - {isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex justify-center">
                        <ProgressRing progress={paidPercentage} />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-base font-semibold">Key Stats</h3>
                            <span className="text-xs text-gray-500">All amounts in {currency}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            <div>
                                <p className="text-xs text-gray-500">Original Amount</p>
                                <p className="text-sm font-semibold">{formatCurrency(originalLoanAmount)}</p>
                            </div>
                             <div>
                                <p className="text-xs text-gray-500">Outstanding Balance</p>
                                <p className="text-sm font-semibold text-red-600">{formatCurrency(outstandingBalance)}</p>
                            </div>
                             <div>
                                <p className="text-xs text-gray-500">Principal Paid</p>
                                <p className="text-sm font-semibold">{formatCurrency(principalPaidToDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Interest Paid</p>
                                <p className="text-sm font-semibold">{formatCurrency(interestPaidToDate)}</p>
                            </div>
                             <div className="col-span-2 border-t mt-1.5 pt-1.5"></div>
                             <div>
                                <p className="text-xs text-gray-500">Projected Total Interest</p>
                                <p className="text-sm font-semibold">{formatCurrency(projectedTotalInterest)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Projected Payoff</p>
                                <p className="text-sm font-semibold">{isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}</p>
                            </div>
                             <div>
                                <p className="text-xs text-gray-500">Per Day Interest</p>
                                <p className="text-sm font-semibold">{formatCurrency(perDayInterest)}</p>
                            </div>
                             <div>
                                <p className="text-xs text-gray-500">Next EMI Date</p>
                                <p className="text-sm font-semibold">{nextEmiDate ? new Date(nextEmiDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Separate page for Total Lifetime Cost Breakdown */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                    <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Total Lifetime Cost Breakdown</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                         </div>
                <div className="bg-gray-50 p-5 rounded-lg border">
                    <div className="flex justify-between mb-3 text-xs">
                        <span className="font-semibold">Paid to Date: {formatCurrency(totalPaidToDate)}</span>
                        <span className="font-semibold">Total Projected Cost: {formatCurrency(originalLoanAmount + projectedTotalInterest)}</span>
                     </div>
                    <Progress value={totalCostProgress} className="h-2" />
                    <p className="text-center text-xs text-gray-500 mt-2">{totalCostProgress.toFixed(1)}% of total lifetime cost paid</p>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Principal Amount</p>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(originalLoanAmount)}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <p className="text-xs text-gray-600 mb-1">Total Interest (Projected)</p>
                        <p className="text-xl font-bold text-orange-900">{formatCurrency(projectedTotalInterest)}</p>
                    </div>
                </div>
            </div>

            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Financial Overview</h2>
                     <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                         <strong>Currency:</strong> {getCurrencyName()}
                     </div>
                 </div>
                 <div className="mb-6">
                    <h3 className="text-xl font-semibold text-center mb-3">Where Your Money Has Gone (To Date)</h3>
                    {interestPieData && interestPieData.length > 0 && interestPieData.some(d => d.value > 0) ? (
                        <>
                            {/* Static Visualization - Always visible for PDF */}
                            <div className="w-[720px] mx-auto mb-6">
                                {(() => {
                                    const total = interestPieData.reduce((sum, d) => sum + d.value, 0);
                                    const principalValue = interestPieData[0].value;
                                    const interestValue = interestPieData[1].value;
                                    const principalPercent = total > 0 ? (principalValue / total) * 100 : 0;
                                    const interestPercent = total > 0 ? (interestValue / total) * 100 : 0;
                                    
                                    return (
                                        <div className="space-y-4">
                                            {/* Pie Chart Visualization using SVG */}
                                            <div className="flex justify-center">
                                                <div className="relative w-48 h-48">
                                                    <svg width="192" height="192" viewBox="0 0 256 256" className="transform -rotate-90">
                                                        <circle
                                                            cx="128"
                                                            cy="128"
                                                            r="100"
                                                            fill="none"
                                                            stroke="#E5E7EB"
                                                            strokeWidth="40"
                                                        />
                                                        {principalPercent > 0 && (
                                                            <circle
                                                                cx="128"
                                                                cy="128"
                                                                r="100"
                                                                fill="none"
                                                                stroke="#2563EB"
                                                                strokeWidth="40"
                                                                strokeDasharray={`${2 * Math.PI * 100}`}
                                                                strokeDashoffset={`${2 * Math.PI * 100 * (1 - principalPercent / 100)}`}
                                                                strokeLinecap="round"
                                                            />
                                                        )}
                                                        {interestPercent > 0 && (
                                                            <circle
                                                                cx="128"
                                                                cy="128"
                                                                r="100"
                                                                fill="none"
                                                                stroke="#FFAB40"
                                                                strokeWidth="40"
                                                                strokeDasharray={`${2 * Math.PI * 100}`}
                                                                strokeDashoffset={`${2 * Math.PI * 100 * (1 - interestPercent / 100)}`}
                                                                strokeLinecap="round"
                                                                transform={`rotate(${principalPercent * 3.6} 128 128)`}
                                                            />
                                                        )}
                                                    </svg>
                                                     <div className="absolute inset-0 flex items-center justify-center">
                                                         <div className="text-center">
                                                             <p className="text-xl font-bold text-gray-800">{total > 0 ? formatCurrency(total) : '$0'}</p>
                                                             <p className="text-xs text-gray-600">Total Paid</p>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                             
                                             {/* Legend and Values */}
                                             <div className="flex justify-center gap-6">
                                                 <div className="flex items-center gap-2">
                                                     <div className="w-5 h-5 rounded-full bg-blue-600"></div>
                                                     <div>
                                                         <p className="text-xs font-semibold text-blue-800">Principal Paid</p>
                                                         <p className="text-base font-bold text-blue-900">{formatCurrency(principalValue)}</p>
                                                         <p className="text-xs text-gray-600">{principalPercent.toFixed(1)}%</p>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-2">
                                                     <div className="w-5 h-5 rounded-full bg-orange-500"></div>
                                                     <div>
                                                         <p className="text-xs font-semibold text-orange-800">Interest Paid</p>
                                                         <p className="text-base font-bold text-orange-900">{formatCurrency(interestValue)}</p>
                                                         <p className="text-xs text-gray-600">{interestPercent.toFixed(1)}%</p>
                                                     </div>
                                                 </div>
                                             </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            
                            {/* Recharts Chart - Hidden but rendered for potential future use */}
                            <div className="w-[720px] mx-auto" style={{ display: 'none', visibility: 'hidden', height: '0', overflow: 'hidden' }}>
                        <ResponsiveContainer width={720} height={350}>
                            <PieChart>
                                        <Pie 
                                            data={interestPieData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            outerRadius={120} 
                                            labelLine={false} 
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return ( <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12"> {`${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`} </text> );
                                            }}
                                        >
                                    <Cell fill="#2563EB" />
                                    <Cell fill="#FFAB40" />
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val as number)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                        </>
                    ) : (
                        <div className="w-[720px] mx-auto h-[350px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="text-center">
                                <p className="text-gray-500 mb-2">No payment data available yet</p>
                                <div className="flex justify-center gap-6 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                                        <span className="text-sm font-semibold text-blue-800">Principal Paid</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                                        <span className="text-sm font-semibold text-orange-800">Interest Paid</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                     <div className="text-center mt-6 bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-bold">Insight:</p>
                        <p className="text-xs text-gray-600">In the early stages of your loan, a larger portion of your payment goes toward interest. As you pay down the principal, this ratio will shift.</p>
                     </div>
                 </div>
            </div>
            
             {/* Page 3: Actionable Insights */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Take Control of Your Debt</h2>
                     <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                         <strong>Currency:</strong> {getCurrencyName()}
                     </div>
                 </div>
                 
                 <div className="mb-4">
                     <h3 className="text-xl font-semibold text-center mb-3">Your Paydown Timeline</h3>
                     <div className="w-[720px] mx-auto" style={{ display: 'block', visibility: 'visible' }}>
                        <ResponsiveContainer width={720} height={300}>
                            <ComposedChart data={timelineData} margin={{ top: 5, right: 30, left: 60, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short'})} 
                                    label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={(val) => formatCurrency(val as number)} label={{ value: 'Remaining Balance', angle: -90, position: 'insideLeft', offset: -40 }}/>
                                <Tooltip 
                                    labelFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                                    formatter={(val) => formatCurrency(val as number)} 
                                />
                                <Legend />
                                <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke='#8884d8' fillOpacity={1} fill="url(#colorBalance)" />
                                <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} dot={false}/>
                            </ComposedChart>
                        </ResponsiveContainer>
                     </div>
                 </div>

                 <p className="text-center text-xs text-gray-600 mb-4">See how extra payments can accelerate your journey to being debt-free.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-semibold text-green-800">Extra Monthly Payments</h3>
                            <span className="text-xs text-gray-500">Amounts in {currency}</span>
                        </div>
                        <div className="space-y-2">
                            {isFinite(whatIf5Percent.months) && whatIf5Percent.monthsSaved > 0 ? (
                                <p className="text-sm">
                                    <span className="font-bold">Pay an extra {formatCurrency(extraPayment5Percent)} per month (5% of EMI):</span><br/>
                                    🕐 Pay off <strong>{whatIf5Percent.monthsSaved.toFixed(0)} months sooner</strong><br/>
                                    💰 Save <strong className="text-green-600">{formatCurrency(whatIf5Percent.interestSaved)}</strong> in interest.
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500">Calculate extra monthly payment scenarios to see potential savings.</p>
                            )}
                            {isFinite(whatIf5Percent.months) && whatIf5Percent.monthsSaved > 0 && isFinite(whatIf10Percent.months) && whatIf10Percent.interestSaved > 0 && <hr className="border-gray-300"/>}
                            {isFinite(whatIf10Percent.months) && whatIf10Percent.monthsSaved > 0 ? (
                                <p className="text-sm">
                                    <span className="font-bold">Pay an extra {formatCurrency(extraPayment10Percent)} per month (10% of EMI):</span><br/>
                                    🕐 Pay off <strong>{whatIf10Percent.monthsSaved.toFixed(0)} months sooner</strong><br/>
                                    💰 Save <strong className="text-green-600">{formatCurrency(whatIf10Percent.interestSaved)}</strong> in interest.
                                </p>
                            ) : null}
                        </div>
                    </div>
                     <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                         <div className="flex justify-between items-center mb-3">
                             <h3 className="text-base font-semibold text-orange-800">Lump-Sum Payment</h3>
                             <span className="text-xs text-gray-500">Amounts in {currency}</span>
                         </div>
                         <div className="space-y-2">
                             {isFinite(whatIf1PercentLump.interestSaved) && whatIf1PercentLump.interestSaved > 0 ? (
                                <p className="text-sm">
                                    <span className="font-bold">Make a one-time {formatCurrency(lumpSum1Percent)} payment (1% of balance):</span><br/>
                                    🕐 Shorten loan by <strong>{whatIf1PercentLump.monthsSaved.toFixed(0)} months</strong><br/>
                                    💰 Save <strong className="text-orange-600">{formatCurrency(whatIf1PercentLump.interestSaved)}</strong> in interest.
                                </p>
                             ) : (
                                <p className="text-sm text-gray-500">Calculate lump-sum payment scenarios to see potential savings.</p>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI-Powered Recommendations for Existing Loans */}
            {aiTips && (
                <>
                     {/* Page 1: Key Recommendations & Prepayment Strategy */}
                     <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                         <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline flex items-center gap-2">
                                 <Lightbulb className="text-yellow-500 w-5 h-5" />
                                 AI-Powered Recommendations
                             </h2>
                             <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                 <strong>Currency:</strong> {getCurrencyName()}
                             </div>
                         </div>
                         
                         {aiTips.keyRecommendations && aiTips.keyRecommendations.length > 0 && (
                             <div className="mb-4">
                                 <h3 className="text-xl font-semibold mb-3 text-blue-800">Key Recommendations</h3>
                                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                     <ul className="space-y-1">
                                         {aiTips.keyRecommendations.map((rec, idx) => (
                                             <li key={idx} className="flex gap-2">
                                                 <Check className="text-green-500 w-4 h-4 mt-0.5 shrink-0" />
                                                 <span className="text-gray-700 text-xs">{rec}</span>
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                         )}

                         {aiTips.prepaymentStrategy && (
                             <div className="mb-4">
                                 <h3 className="text-xl font-semibold mb-3 text-green-800">Prepayment Strategy</h3>
                                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                     <p className="text-gray-700 mb-3 text-xs">{aiTips.prepaymentStrategy.recommendation}</p>
                                     {aiTips.prepaymentStrategy.monthlyExtra && (
                                         <div className="grid grid-cols-2 gap-3 mt-3">
                                             <div className="bg-white p-3 rounded border">
                                                 <p className="text-xs text-gray-500">Recommended Monthly Extra</p>
                                                 <p className="text-lg font-bold text-green-600">{formatCurrency(aiTips.prepaymentStrategy.monthlyExtra)}</p>
                                             </div>
                                             {aiTips.prepaymentStrategy.savings && (
                                                 <div className="bg-white p-3 rounded border">
                                                     <p className="text-xs text-gray-500">Potential Savings</p>
                                                     <p className="text-lg font-bold text-green-600">{formatCurrency(aiTips.prepaymentStrategy.savings)}</p>
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         )}

                         {aiTips.refinancingOpportunity && (
                             <div className="mb-4">
                                 <h3 className="text-xl font-semibold mb-3 text-purple-800">Refinancing Opportunity</h3>
                                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                     <p className="text-gray-700 text-xs">
                                         {typeof aiTips.refinancingOpportunity === 'string' 
                                             ? aiTips.refinancingOpportunity 
                                             : JSON.stringify(aiTips.refinancingOpportunity)}
                                     </p>
                                 </div>
                             </div>
                         )}
                     </div>

                     {/* Page 2: Risk Analysis & Action Items */}
                     {(aiTips.riskAnalysis && aiTips.riskAnalysis.length > 0) || (aiTips.actionItems && aiTips.actionItems.length > 0) ? (
                         <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                             <div className="flex justify-between items-center mb-4">
                                 <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline flex items-center gap-2">
                                     <Lightbulb className="text-yellow-500 w-5 h-5" />
                                     AI-Powered Recommendations (Continued)
                                 </h2>
                                 <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                     <strong>Currency:</strong> {getCurrencyName()}
                                 </div>
                             </div>

                             {aiTips.riskAnalysis && aiTips.riskAnalysis.length > 0 && (
                                 <div className="mb-4">
                                     <h3 className="text-xl font-semibold mb-3 text-orange-800">Risk Analysis</h3>
                                     <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                         <ul className="space-y-1">
                                             {aiTips.riskAnalysis.map((risk, idx) => (
                                                 <li key={idx} className="flex gap-2">
                                                     <span className="text-orange-600 font-bold">⚠</span>
                                                     <span className="text-gray-700 text-xs">{risk}</span>
                                                 </li>
                                             ))}
                                         </ul>
                                     </div>
                                 </div>
                             )}

                             {aiTips.actionItems && aiTips.actionItems.length > 0 && (
                                 <div className="mb-4">
                                     <h3 className="text-xl font-semibold mb-3 text-indigo-800">Prioritized Action Items</h3>
                                     <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                         <ol className="space-y-1 list-decimal list-inside">
                                             {aiTips.actionItems.map((action, idx) => {
                                                 // Handle both string and object formats
                                                 const actionText = typeof action === 'string' 
                                                     ? action 
                                                     : (action as any)?.action || (action as any)?.text || JSON.stringify(action);
                                                 const timeline = typeof action === 'object' && (action as any)?.timeline 
                                                     ? ` (${(action as any).timeline})` 
                                                     : '';
                                                 return (
                                                     <li key={idx} className="text-gray-700 text-xs">
                                                         {actionText}{timeline}
                                                     </li>
                                                 );
                                             })}
                                         </ol>
                                     </div>
                                 </div>
                             )}

                             {aiTips.insights && aiTips.insights.length > 0 && (
                                 <div>
                                     <h3 className="text-xl font-semibold mb-3 text-teal-800">Additional Insights</h3>
                                     <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                                         <ul className="space-y-1">
                                             {aiTips.insights.map((insight, idx) => (
                                                 <li key={idx} className="flex gap-2">
                                                     <span className="text-teal-600 font-bold">💡</span>
                                                     <span className="text-gray-700 text-xs">{insight}</span>
                                                 </li>
                                             ))}
                                         </ul>
                                     </div>
                                 </div>
                             )}
                         </div>
                     ) : null}
                </>
            )}

            {/* Year-by-Year Summary for Existing Loans */}
            {(() => {
                const transactionsByYear = schedule.reduce((acc, t) => {
                    const year = new Date(t.date).getFullYear();
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(t);
                    return acc;
                }, {} as Record<number, typeof schedule>);
                
                const years = Object.keys(transactionsByYear).map(Number).sort();
                
                return years.length > 0 ? (
                    <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Year-by-Year Summary</h2>
                            <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                <strong>Currency:</strong> {getCurrencyName()}
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Annual breakdown of payments and progress</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-xs">
                                <thead>
                                    <tr className="bg-blue-900 text-white">
                                        <th className="border border-gray-300 p-1 text-left">Year</th>
                                        <th className="border border-gray-300 p-1 text-right">Total Paid</th>
                                        <th className="border border-gray-300 p-1 text-right">Principal</th>
                                        <th className="border border-gray-300 p-1 text-right">Interest</th>
                                        <th className="border border-gray-300 p-1 text-right">Ending Balance</th>
                                        <th className="border border-gray-300 p-1 text-right">% Paid</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {years.map((year, idx) => {
                                        const yearTransactions = transactionsByYear[year];
                                        const totalPaid = yearTransactions.filter(t => t.type === 'repayment').reduce((sum, t) => sum + t.amount, 0);
                                        const principalPaid = yearTransactions.filter(t => t.type === 'repayment').reduce((sum, t) => sum + t.principal, 0);
                                        const interestPaid = yearTransactions.filter(t => t.type === 'repayment').reduce((sum, t) => sum + t.interest, 0);
                                        const lastTransaction = yearTransactions[yearTransactions.length - 1];
                                        const endingBalance = lastTransaction?.endingBalance || outstandingBalance;
                                        const percentPaid = originalLoanAmount > 0 ? ((originalLoanAmount - endingBalance) / originalLoanAmount) * 100 : 0;
                                        
                                        return (
                                            <tr key={year} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                <td className="border border-gray-300 p-1 font-semibold">{year}</td>
                                                <td className="border border-gray-300 p-1 text-right">{formatCurrency(totalPaid)}</td>
                                                <td className="border border-gray-300 p-1 text-right">{formatCurrency(principalPaid)}</td>
                                                <td className="border border-gray-300 p-1 text-right">{formatCurrency(interestPaid)}</td>
                                                <td className="border border-gray-300 p-1 text-right font-semibold">{formatCurrency(endingBalance)}</td>
                                                <td className="border border-gray-300 p-1 text-right">{percentPaid.toFixed(1)}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Payment Calendar for Existing Loans */}
            {nextEmiDate && baseMonthlyPayment > 0 && (() => {
                // Calculate starting payment number based on payments already made
                const paymentsMade = schedule.filter(t => t.type === 'repayment' && !t.note?.includes('Missed')).length;
                const startingPaymentNumber = paymentsMade + 1;
                
                return (
                    <div className="pdf-page bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
                        <div className="flex justify-between items-center mb-1" style={{ marginBottom: '6px' }}>
                            <h2 className="text-base font-bold text-blue-900 border-b border-blue-800 pb-0.5 font-headline" style={{ fontSize: '16px', paddingBottom: '3px' }}>Payment Calendar</h2>
                            <div className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded" style={{ fontSize: '9px', padding: '2px 5px' }}>
                                <strong>Currency:</strong> {getCurrencyName()}
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-1" style={{ fontSize: '9px', marginBottom: '6px' }}>Upcoming payment schedule for the next 12 months</p>
                        <div className="grid grid-cols-3 gap-1.5 flex-1" style={{ gap: '6px', flex: '1 1 auto', gridAutoRows: '1fr' }}>
                            {Array.from({ length: 12 }, (_, idx) => {
                                const paymentDate = new Date(nextEmiDate);
                                paymentDate.setMonth(paymentDate.getMonth() + idx);
                                const monthlyRate = interestRate / 100 / 12;
                                // Calculate balance progressively
                                let runningBalance = outstandingBalance;
                                for (let i = 0; i < idx; i++) {
                                    const interestForMonth = runningBalance * monthlyRate;
                                    const principalForMonth = baseMonthlyPayment - interestForMonth;
                                    runningBalance = Math.max(0, runningBalance - principalForMonth);
                                }
                                const interestForMonth = runningBalance * monthlyRate;
                                const principalForMonth = baseMonthlyPayment - interestForMonth;
                                const newBalance = Math.max(0, runningBalance - principalForMonth);
                                
                                return (
                                    <div key={idx} className="bg-gray-50 rounded border border-gray-200 flex flex-col justify-between" style={{ padding: '6px', minHeight: '110px', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ marginBottom: '3px' }}>
                                            <p className="font-semibold" style={{ fontSize: '10px', lineHeight: '1.1', fontWeight: '600' }}>{paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                                            <p style={{ fontSize: '9px', color: '#6b7280' }}>Payment #{startingPaymentNumber + idx}</p>
                                        </div>
                                        <div className="mt-auto" style={{ fontSize: '9px', lineHeight: '1.2' }}>
                                            <p style={{ lineHeight: '1.2', marginBottom: '1px' }}><span style={{ color: '#6b7280' }}>Payment:</span> <span style={{ fontWeight: '700' }}>{formatCurrency(baseMonthlyPayment)}</span></p>
                                            <p style={{ lineHeight: '1.2', marginBottom: '1px' }}><span style={{ color: '#6b7280' }}>Principal:</span> {formatCurrency(principalForMonth)}</p>
                                            <p style={{ lineHeight: '1.2', marginBottom: '1px' }}><span style={{ color: '#6b7280' }}>Interest:</span> {formatCurrency(interestForMonth)}</p>
                                            <p style={{ borderTop: '1px solid #d1d5db', paddingTop: '1px', marginTop: '1px', lineHeight: '1.2' }}><span style={{ color: '#6b7280' }}>Balance:</span> <span style={{ fontWeight: '600' }}>{formatCurrency(newBalance)}</span></p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {hasMultipleDisbursements && (
                <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Disbursement History</h2>
                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            <strong>Currency:</strong> {getCurrencyName()}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-semibold text-center mb-3">Loan Funds Released Over Time</h3>
                        <div className="w-[720px] mx-auto" style={{ display: 'block', visibility: 'visible' }}>
                            <ResponsiveContainer width={720} height={Math.min(200 + (disbursementChartData.length * 20), 300)}>
                               <BarChart
                                    data={disbursementChartData}
                                    layout="vertical"
                                    margin={{ top: 20, right: 50, left: 50, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(val) => formatCurrency(val as number)}/>
                                    <YAxis type="category" dataKey="date" width={80} interval={0} />
                                    <Tooltip
                                        formatter={(val) => formatCurrency(val as number)}
                                        labelStyle={{ color: 'black' }}
                                    />
                                    <Bar dataKey="amount" name="Disbursed Amount" fill="#2563EB">
                                        <LabelList dataKey="amount" position="right" formatter={(val: number) => formatCurrency(val)} className="fill-gray-800 font-semibold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Page 4: Action Plan & Upsell */}
            <div className="pdf-page flex flex-col p-6 pt-10 bg-white text-gray-800" style={{ width: '800px', height: '1120px', minHeight: '1120px', maxHeight: '1120px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-800 pb-1 font-headline">Your Recommended Action Plan</h2>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <strong>Currency:</strong> {getCurrencyName()}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                     <h3 className="text-base font-bold text-gray-800 mb-3">Based on your report, here are your next steps:</h3>
                    <ul className="space-y-2 text-sm">
                        {isFinite(whatIf5Percent.interestSaved) && whatIf5Percent.interestSaved > 20 && <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 shrink-0 mt-0.5" /><span>Schedule an extra <strong>{formatCurrency(extraPayment5Percent)}</strong> payment this month. This can save you over <strong>{formatCurrency(whatIf5Percent.interestSaved)}!</strong></span></li>}
                        <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 shrink-0 mt-0.5" /><span>Set up payment reminders for your due date to avoid late fees.</span></li>
                        <li className="flex gap-2"><Check className="text-green-500 w-4 h-4 shrink-0 mt-0.5" /><span>Use your Tracker Pro account to set a custom payoff goal.</span></li>
                    </ul>
                </div>
                 
                 <div className="text-center mt-auto pt-4">
                     <h3 className="text-xl font-bold font-headline text-primary">From Insight to Action: Stop Calculating and Start Tracking</h3>
                     <p className="text-sm text-gray-600 mt-2 max-w-2xl mx-auto">Track your progress in real-time, get payment reminders, and run unlimited 'what-if' scenarios with your LoanZen Tracker Pro dashboard.</p>
                     
                     <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                        <p className="text-base font-bold">Your exclusive upgrade offer is in your email.</p>
                        <p className="text-sm mt-2">Use your personal code for a <span className="font-extrabold text-green-600">14-DAY FREE TRIAL!</span></p>
                     </div>
                 </div>
             </div>
        </>
    )
}

export default function ReportTemplate({ reportData }: ReportDataType) {
  const currencyContext = useCurrency();
  // Use currency from reportData if available (for PDF generation), otherwise use context
  const reportCurrency = (reportData as any).currency || currencyContext.currency;
  
  // Create formatCurrency function using the report currency
  const formatCurrency = (value: number): string => {
    const CURRENCY_LOCALE_MAP: Record<string, string> = {
      USD: 'en-US',
      EUR: 'en-US',
      GBP: 'en-GB',
      INR: 'en-IN',
    };
    
    const CURRENCY_SYMBOLS: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
    };
    
    const locale = CURRENCY_LOCALE_MAP[reportCurrency] || 'en-US';
    const currencyCode = reportCurrency || 'USD';
    const expectedSymbol = CURRENCY_SYMBOLS[currencyCode] || '$';
    
    try {
      // Create formatter with explicit locale and currency
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        numberingSystem: 'latn', // Force Latin numbering system
      });
      
      const formatted = formatter.format(value);
      
      // Double-check: if the formatted string contains unexpected currency symbols, fix it
      // This is a safety check in case browser locale interferes
      if (expectedSymbol && !formatted.includes(expectedSymbol) && !formatted.includes(currencyCode)) {
        // If the expected symbol is missing, manually format with the correct symbol
        const numberPart = value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `${expectedSymbol}${numberPart}`;
      }
      
      return formatted;
    } catch (error) {
      // Fallback: manually format with correct symbol
      console.warn('Currency formatting error, using manual format:', error);
      const numberPart = value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${expectedSymbol}${numberPart}`;
    }
  };
  
  // Get currency name for display
  const getCurrencyName = (): string => {
    const currencyNames: Record<string, string> = {
      USD: 'US Dollar (USD)',
      EUR: 'Euro (EUR)',
      GBP: 'British Pound (GBP)',
      INR: 'Indian Rupee (INR)',
    };
    return currencyNames[reportCurrency] || 'US Dollar (USD)';
  };
  
    if (!reportData) return null;

    const { formType, userEmail, generatedAt } = reportData;
    // Using static coupon code instead of dynamic one
    const couponCode = LOANZEN_TRIAL_COUPON_CODE;
    const { sessionId } = (reportData as any);
    
    // Find the first disbursement date
    let disbursementDate = 'N/A';
    if (reportData.formType === 'existing-loan') {
        const firstDisbursement = (reportData as ExistingLoanReportResults).schedule.find(t => t.type === 'disbursement');
        if (firstDisbursement) {
            disbursementDate = new Date(firstDisbursement.date).toLocaleDateString();
        }
    } else {
        // For new loans, we can assume the generation date is close enough for a "Statement Period"
        disbursementDate = new Date(generatedAt).toLocaleDateString();
    }
    
    return (
        <div className="bg-gray-100 text-gray-800 font-body" style={{width: '800px'}}>
        
        {/* Page 1: Cover */}
        <div className="pdf-page flex flex-col justify-between p-8 bg-white text-gray-800" style={{
            width: '800px',
            height: '1120px',
            minHeight: '1120px',
            maxHeight: '1120px',
            overflow: 'hidden',
            boxSizing: 'border-box',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='800' height='1120' viewBox='0 0 800 1120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop stop-color='%23F0F9FF' offset='0%25'/%3E%3Cstop stop-color='white' offset='100%25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='1120'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover'
        }}>
          <div className="flex flex-col items-center justify-center flex-1">
            {/* Logo Section - Centered */}
            <div className="flex flex-col items-center justify-center mb-16">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/logo.png" 
                  alt="LoanZen Logo" 
                  style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
                <span className="font-headline text-4xl font-bold text-blue-900">LoanZen</span>
              </div>
            </div>
            
            <p className="text-5xl font-semibold mt-8 font-headline text-blue-900 text-center">
              {formType === 'new-loan' ? 'Loan Comparison Report' : 'Loan Health Statement'}
            </p>
             <div className="mt-16 text-lg text-gray-600 text-center">
              <p className="text-2xl">Prepared Exclusively for</p>
              <p className="font-bold text-3xl text-blue-800 mt-2">{userEmail || 'Valued Customer'}</p>
            </div>
             <div className="mt-24 text-sm text-gray-500 space-y-1 text-center">
                {sessionId && <p><strong>Report ID:</strong> {sessionId}</p>}
                <p><strong>Currency:</strong> {getCurrencyName()}</p>
                <p><strong>Statement Period:</strong> {disbursementDate} to {new Date(generatedAt).toLocaleDateString()}</p>
                <p><strong>Date of Generation:</strong> {new Date(generatedAt).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 pb-4 max-w-lg mx-auto">
              This report is for informational purposes only. For exact figures, please consult your loan servicer. This report is based on user-provided data as of {new Date(generatedAt).toLocaleDateString()}.
          </p>
        </div>

        {formType === 'new-loan' 
            ? <NewLoanReport reportData={reportData as NewLoanCalculationResults} formatCurrency={formatCurrency} currency={reportCurrency} getCurrencyName={getCurrencyName} aiTips={(reportData as any).aiTips} />
            : <ExistingLoanReport reportData={reportData as ExistingLoanReportResults} formatCurrency={formatCurrency} currency={reportCurrency} getCurrencyName={getCurrencyName} aiTips={(reportData as any).aiTips} />
        }
        
      </div>
    );
}



    

    




    

  




    

    