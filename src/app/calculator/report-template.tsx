
'use client'

import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Line, ComposedChart, Area, LineChart } from 'recharts';
import type { CalculationResults as ReportDataType, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';
import { Banknote, CalendarCheck, Check, Lightbulb, TrendingUp } from 'lucide-react';
import Logo from '@/components/logo';
import Image from 'next/image';


interface ReportTemplateProps {
  reportData: ReportDataType;
  sessionId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const loanTypeLabels: { [key: string]: string } = {
  home: 'Home Loan',
  car: 'Car Loan',
  personal: 'Personal Loan',
  education: 'Education Loan',
  custom: 'Custom Loan',
  'credit-line': 'Credit Line',
  other: 'Other',
};

const ProgressRing = ({ progress }: { progress: number }) => {
    const strokeWidth = 12;
    const radius = 80;
    const normalizedRadius = radius - strokeWidth * 2;
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
            <div className="absolute flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-gray-700">{`${Math.round(progress)}%`}</span>
                 <span className="text-lg text-gray-500">Paid</span>
            </div>
        </div>
    );
};


const NewLoanReport = ({ reportData }: { reportData: NewLoanCalculationResults }) => {
    const { scenarios } = reportData;
    const hasMultipleScenarios = scenarios.length > 1;
    const bestScenario = [...scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0];
    const worstScenario = hasMultipleScenarios ? [...scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0] : scenarios[0];
    const savings = worstScenario.totalInterest - bestScenario.totalInterest;

    // Data for charts
    const totalCostData = scenarios.map(s => ({
        name: s.scenarioName,
        'Total Cost': s.totalPayment,
    }));

    const firstYearAmortization = bestScenario.amortizationSchedule.slice(0, 12).map(a => ({
        month: `M${a.month}`,
        Principal: a.principal,
        Interest: a.interest,
    }));

    const paydownData = scenarios.slice(0, 2).map(s => {
        return s.amortizationSchedule
            .filter(a => a.month % 12 === 0 || a.month === 1)
            .map(a => ({
                year: Math.floor(a.month / 12),
                [s.scenarioName]: a.remainingBalance
            }));
    }).reduce((acc, current) => {
        current.forEach(d => {
            const existing = acc.find(item => item.year === d.year);
            if (existing) {
                Object.assign(existing, d);
            } else {
                acc.push(d);
            }
        });
        return acc;
    }, [] as any[]);


     return (
        <>
            {/* Page 2: Executive Summary */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">
                    {hasMultipleScenarios ? "Your Recommended Path" : "Your Loan Health Snapshot"}
                </h2>
                {hasMultipleScenarios && (
                    <div className="text-center bg-green-50/50 p-6 rounded-lg mb-8">
                        <p className="text-xl text-green-800">Based on our analysis, you will save:</p>
                        <p className="text-6xl font-bold text-green-600 my-2">{formatCurrency(savings)}</p>
                        <p className="text-xl text-green-800">by choosing the "{bestScenario.scenarioName}" option.</p>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-8">
                    {hasMultipleScenarios && (
                         <div className="bg-gray-50 p-6 rounded-lg border">
                            <h3 className="text-xl font-semibold mb-4 text-center">Winner Comparison</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-white rounded-md border-2 border-green-500">
                                     <p className="font-bold flex items-center gap-2"><TrendingUp className="text-green-500" /> Best Option: {bestScenario.scenarioName} @ {bestScenario.interestRate}%</p>
                                     <p className="text-2xl font-semibold mt-1">Total Cost: {formatCurrency(bestScenario.totalPayment)}</p>
                                </div>
                                 <div className="p-4 bg-white rounded-md border">
                                     <p className="font-bold flex items-center gap-2"><Banknote className="text-blue-500" /> Other Option: {worstScenario.scenarioName} @ {worstScenario.interestRate}%</p>
                                     <p className="text-2xl font-semibold mt-1">Total Cost: {formatCurrency(worstScenario.totalPayment)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="bg-gray-50 p-6 rounded-lg border">
                         <h3 className="text-xl font-semibold mb-4 text-center">Key Insights</h3>
                         <ul className="space-y-3">
                            {hasMultipleScenarios && (
                                <li className="flex gap-3"><Check className="text-green-500 w-5 h-5 mt-1 shrink-0" /> <span><strong>Save Big:</strong> Choosing our recommendation saves you <span className="font-bold">{formatCurrency(savings)}</span> in interest.</span></li>
                            )}
                            <li className="flex gap-3"><Check className="text-green-500 w-5 h-5 mt-1 shrink-0" /> <span><strong>Monthly Payment:</strong> Your estimated payment for the best option is <span className="font-bold">{formatCurrency(bestScenario.monthlyPayment)}</span>.</span></li>
                            <li className="flex gap-3"><Check className="text-green-500 w-5 h-5 mt-1 shrink-0" /> <span><strong>Loan Term:</strong> You'll be debt-free in <span className="font-bold">{bestScenario.loanTerm}</span> years.</span></li>
                         </ul>
                    </div>
                </div>
            </div>

            {/* Page 3: Visual Comparison */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white">
              <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Visual Breakdown of Your Options</h2>
              
              {hasMultipleScenarios && (
                <div className="mb-12">
                  <h3 className="text-2xl font-semibold text-center mb-6">Total Cost Comparison</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={totalCostData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(val) => formatCurrency(val as number)}/>
                      <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                      <Bar dataKey="Total Cost">
                         {totalCostData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === bestScenario.scenarioName ? '#10B981' : '#3F51B5'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div>
                    <h3 className="text-2xl font-semibold text-center mb-6">Monthly Payment Breakdown (First Year)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={firstYearAmortization} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="month" />
                            <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                            <Legend />
                            <Bar dataKey="Principal" stackId="a" fill="#2563EB" />
                            <Bar dataKey="Interest" stackId="a" fill="#FFAB40" />
                         </BarChart>
                     </ResponsiveContainer>
                </div>
                {hasMultipleScenarios && (
                     <div>
                        <h3 className="text-2xl font-semibold text-center mb-6">Paydown Timeline</h3>
                         <ResponsiveContainer width="100%" height={300}>
                             <LineChart data={paydownData}>
                                 <CartesianGrid strokeDasharray="3 3" />
                                 <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                                 <YAxis tickFormatter={(val) => formatCurrency(val as number)}/>
                                <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                                <Legend />
                                 {scenarios.slice(0, 2).map((s, i) => (
                                    <Line key={s.scenarioName} type="monotone" dataKey={s.scenarioName} stroke={['#10B981', '#3F51B5'][i]} strokeWidth={3} />
                                 ))}
                             </LineChart>
                         </ResponsiveContainer>
                    </div>
                )}
              </div>
            </div>
        </>
     )
}


const ExistingLoanReport = ({ reportData }: { reportData: ExistingLoanReportResults }) => {
    const { originalLoanAmount, outstandingBalance, interestPaidToDate, nextEmiDate, schedule } = reportData;
    const paidAmount = originalLoanAmount - outstandingBalance;
    const paidPercentage = (paidAmount / originalLoanAmount) * 100;
    const remainingPercentage = 100 - paidPercentage;

    const interestPieData = [
        { name: 'Original Principal', value: originalLoanAmount },
        { name: 'Interest Paid to Date', value: interestPaidToDate },
    ];
    
    // Simplified payoff date projection
    const lastPayment = [...schedule].reverse().find(s => s.type === 'repayment');
    let projectedPayoffDate = 'N/A';
    if(lastPayment && outstandingBalance > 0) {
        const monthsRemaining = outstandingBalance / lastPayment.amount;
        projectedPayoffDate = new Date(new Date().setMonth(new Date().getMonth() + monthsRemaining)).toLocaleDateString('en-US', { year: 'numeric', month: 'short'});
    }


    return (
        <>
             {/* Page 2: Executive Summary */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white">
                 <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Loan Health Snapshot</h2>
                 <div className="text-center bg-blue-50/50 p-6 rounded-lg mb-8">
                    <p className="text-xl text-blue-800">Your current outstanding balance is:</p>
                    <p className="text-6xl font-bold text-blue-600 my-2">{formatCurrency(outstandingBalance)}</p>
                </div>
                 <h3 className="text-2xl font-semibold mb-4 text-center">Loan Health Dashboard</h3>
                 <div className="grid grid-cols-2 gap-8 items-center">
                    <div className="flex justify-center">
                         <ProgressRing progress={paidPercentage} />
                    </div>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={interestPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {interestPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3F51B5', '#FFAB40'][index % 2]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-6 mt-8">
                     <div className="bg-gray-100 p-4 rounded-lg text-center">
                         <p className="text-sm text-gray-500">Total Interest Paid</p>
                         <p className="text-2xl font-bold">{formatCurrency(interestPaidToDate)}</p>
                    </div>
                     <div className="bg-gray-100 p-4 rounded-lg text-center">
                         <p className="text-sm text-gray-500">Projected Payoff</p>
                         <p className="text-2xl font-bold">{projectedPayoffDate}</p>
                    </div>
                     <div className="bg-gray-100 p-4 rounded-lg text-center">
                         <p className="text-sm text-gray-500">Next Payment Due</p>
                         <p className="text-2xl font-bold">{nextEmiDate ? new Date(nextEmiDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                 </div>
            </div>
        </>
    )
}

export default function ReportTemplate({ reportData, sessionId }: ReportTemplateProps) {
    if (!reportData) return null;

    const { formType, userEmail, generatedAt } = reportData;
    
    return (
        <div className="bg-gray-100 text-gray-800 font-body" style={{width: '800px'}}>
        
        {/* Page 1: Cover */}
        <div className="pdf-page h-full flex flex-col justify-between p-10 bg-white" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='800' height='1120' viewBox='0 0 800 1120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop stop-color='%23F0F9FF' offset='0%25'/%3E%3Cstop stop-color='white' offset='100%25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='1120'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover'
        }}>
          <div className="text-center pt-24">
            <div className="inline-block">
                <Logo />
            </div>
            <p className="text-5xl font-semibold mt-16 font-headline text-blue-900">
                Loan Analysis Report
            </p>
             <div className="mt-24 text-lg text-gray-600">
              <p className="text-2xl">Prepared Exclusively for</p>
              <p className="font-bold text-3xl text-blue-800 mt-2">{userEmail || 'Valued Customer'}</p>
            </div>
            <div className="mt-24 text-sm text-gray-500">
              <p><strong>Date of Generation:</strong> {new Date(generatedAt).toLocaleString()}</p>
              <p><strong>Report ID:</strong> {sessionId}</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 pb-4">
              This report is for informational purposes only. All calculations are estimates based on the data you provided.
          </p>
        </div>

        {formType === 'new-loan' 
            ? <NewLoanReport reportData={reportData as NewLoanCalculationResults} />
            : <ExistingLoanReport reportData={reportData as ExistingLoanReportResults} />
        }
        
        {/* Page 5: The Upsell */}
        <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white">
             <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Journey to Debt-Free Isn't Over</h2>
             <p className="text-center text-xl text-gray-600 mb-8">Turn this plan into reality with LoanZen Tracker.</p>
             
             <div className="px-8">
                <Image 
                    src="https://picsum.photos/seed/report-mockup/700/400"
                    width={700}
                    height={400}
                    alt="Dashboard Mockup"
                    className="rounded-lg shadow-2xl border-4 border-gray-200"
                    data-ai-hint="financial dashboard chart"
                />
             </div>
             
             <div className="mt-12 grid grid-cols-2 gap-8 text-lg">
                <ul className="space-y-4">
                    <li className="flex gap-3"><Check className="text-green-500 w-7 h-7 shrink-0" /> <span>Track all your loans in one place.</span></li>
                    <li className="flex gap-3"><Check className="text-green-500 w-7 h-7 shrink-0" /> <span>See your payoff progress on interactive charts.</span></li>
                    <li className="flex gap-3"><Check className="text-green-500 w-7 h-7 shrink-0" /> <span>Get alerts before payments are due.</span></li>
                    <li className="flex gap-3"><Check className="text-green-500 w-7 h-7 shrink-0" /> <span>Model how extra payments save you money.</span></li>
                </ul>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
                    <p className="text-xl italic text-blue-800">"I paid off my loan 2 years early using the tracker's advice. Seeing the numbers visually made all the difference."</p>
                    <p className="text-right font-bold mt-2">- Alex T.</p>
                </div>
             </div>
             
             <div className="text-center mt-16 bg-gray-100 p-6 rounded-lg">
                <p className="text-2xl font-bold">Your exclusive offer is in your email.</p>
                <p className="text-xl mt-2">Start your 14-day free trial now!</p>
             </div>
        </div>

      </div>
    );
}
