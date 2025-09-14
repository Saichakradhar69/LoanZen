
'use client'

import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Line, ComposedChart, Area, LineChart, LabelList } from 'recharts';
import type { CalculationResults as ReportDataType, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';
import { Banknote, CalendarCheck, Check, Gift, Lightbulb, TrendingUp } from 'lucide-react';
import Logo from '@/components/logo';


interface ReportTemplateProps {
  reportData: ReportDataType;
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
    const monthlyRate = annualRate / 12 / 100;
    let balance = principal - lumpSum;
    let months = 0;
    let totalInterest = 0;

    const fullPayment = monthlyPayment + extraMonthly;

    if (lumpSum > 0 && balance <=0) { // Paid off with lump sum
         return { months: 0, totalInterest: 0, years: 0, monthsSaved: baseMonths, interestSaved: baseInterest };
    }

    while (balance > 0) {
        const interest = balance * monthlyRate;

        if (fullPayment <= interest) {
             return { months: Infinity, totalInterest: Infinity, years: Infinity, monthsSaved: 0, interestSaved: 0 };
        }

        const principalPaid = fullPayment - interest;

        balance -= principalPaid;
        totalInterest += interest;
        months++;
        if (months > 1200) return { months: Infinity, totalInterest: Infinity, years: Infinity, monthsSaved: 0, interestSaved: 0 };
    }

    const years = months / 12;
    const monthsSaved = baseMonths - months;
    const interestSaved = baseInterest - totalInterest;

    return { months, totalInterest, years, monthsSaved, interestSaved };
}


const ProgressRing = ({ progress }: { progress: number }) => {
    const strokeWidth = 12;
    const radius = 80;
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
            <div className="absolute flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-gray-700">{`${Math.round(progress)}%`}</span>
                 <span className="text-lg text-gray-500">Paid Off</span>
            </div>
        </div>
    );
};

const AmortizationTimelineChart = ({ originalTerm, scenarios }: { originalTerm: number, scenarios: { name: string, months: number }[] }) => {
    const data = [{
        name: 'Terms',
        "Original Term": originalTerm,
        ...scenarios.reduce((acc, s) => ({ ...acc, [s.name]: s.months }), {})
    }];
    
    const bars = [
      { key: "Original Term", fill: "#3F51B5", name: "Current Plan" },
      ...scenarios.map((s, i) => ({ key: s.name, fill: ['#10B981', '#FFAB40'][i % 2], name: s.name }))
    ];


    return (
        <ResponsiveContainer width="100%" height={150 + (scenarios.length * 20)}>
            <BarChart data={data} layout="vertical" barCategoryGap="25%" margin={{ left: 30 }}>
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
                            formatter={(value: number) => `${value} months`}
                        />
                    </Bar>
                ))}
            </BarChart>
        </ResponsiveContainer>
    )
}


const NewLoanReport = ({ reportData }: { reportData: NewLoanCalculationResults }) => {
    const { scenarios } = reportData;
    const hasMultipleScenarios = scenarios.length > 1;
    const bestScenario = [...scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0];
    const worstScenario = hasMultipleScenarios ? [...scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0] : scenarios[0];
    const savings = worstScenario.totalInterest - bestScenario.totalInterest;

    // What-if scenarios for the best option
    const baseMonths = bestScenario.loanTerm * 12;
    const whatIf50 = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, 50);
    const whatIf100 = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, 100);


    return (
        <>
            {/* Page 2: Executive Summary */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-center text-blue-800">What-If Scenarios</h3>
                    <p className="text-center text-sm text-blue-700 mb-4">See how you can pay off your loan even faster.</p>
                    <div className="text-center space-y-2">
                        <p>If you pay an extra <strong>{formatCurrency(50)}/month</strong>, you will be debt-free <strong>{whatIf50.monthsSaved} months sooner</strong> and save <strong>{formatCurrency(whatIf50.interestSaved)}</strong> in interest.</p>
                         <p>If you pay an extra <strong>{formatCurrency(100)}/month</strong>, you will be debt-free <strong>{whatIf100.monthsSaved} months sooner</strong> and save <strong>{formatCurrency(whatIf100.interestSaved)}</strong> in interest.</p>
                    </div>
                </div>
            </div>

            {/* Page 3: Visual Comparison */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
              <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Visual Breakdown of Your Options</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div>
                    <h3 className="text-2xl font-semibold text-center mb-6">Paydown Timeline</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={bestScenario.amortizationSchedule.filter(a => a.month % 12 === 0 || a.month === 1).map(a => ({ year: Math.floor(a.month / 12), balance: a.remainingBalance }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                            <YAxis tickFormatter={(val) => formatCurrency(val as number)}/>
                            <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                            <Legend />
                            <Line type="monotone" dataKey="balance" name="Remaining Balance" stroke='#10B981' strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                 <div>
                    <h3 className="text-2xl font-semibold text-center mb-6">First Year: Principal vs. Interest</h3>
                     <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={bestScenario.amortizationSchedule.slice(0, 12)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="month" tickFormatter={(val) => `M${val}`} />
                            <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                            <Legend />
                            <Bar dataKey="principal" name="Principal" stackId="a" fill="#2563EB" />
                            <Bar dataKey="interest" name="Interest" stackId="a" fill="#FFAB40" />
                         </BarChart>
                     </ResponsiveContainer>
                </div>
              </div>
                <div className="mt-8">
                     <h3 className="text-2xl font-semibold text-center mb-6">Amortization Timeline with Extra Payments</h3>
                     <AmortizationTimelineChart originalTerm={baseMonths} scenarios={[
                         { name: '+ $50/mo', months: whatIf50.months},
                         { name: '+ $100/mo', months: whatIf100.months}
                     ]} />
                </div>
            </div>
        </>
     )
}


const ExistingLoanReport = ({ reportData }: { reportData: ExistingLoanReportResults }) => {
    const { originalLoanAmount, outstandingBalance, interestPaidToDate, schedule, interestRate, nextEmiDate } = reportData;
    const paidAmount = originalLoanAmount - outstandingBalance;
    const paidPercentage = (paidAmount / originalLoanAmount) * 100;
    
    const lastRepayment = [...schedule].reverse().find(s => s.type === 'repayment');
    const baseMonthlyPayment = lastRepayment ? lastRepayment.amount : (outstandingBalance > 0 ? outstandingBalance / 120 : originalLoanAmount / 120); 

    const baseScenario = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, 0, 0); // Base case to get months and interest from now
    const totalInterestFromNow = isFinite(baseScenario.totalInterest) ? baseScenario.totalInterest : 0;
    const totalMonthsFromNow = isFinite(baseScenario.months) ? baseScenario.months : 0;
    
    const projectedPayoffDate = new Date();
    if (isFinite(totalMonthsFromNow)) {
        projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + totalMonthsFromNow);
    }
    
    // What-if scenarios
    const whatIf50 = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 50);
    const whatIf100 = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 100);
    const whatIf500Lump = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 0, 500);

    const interestPieData = [
        { name: 'Principal Paid', value: paidAmount },
        { name: 'Interest Paid', value: interestPaidToDate },
        { name: 'Remaining Principal', value: outstandingBalance },
    ];
    
    const nextSixPayments = schedule.filter(s => new Date(s.date) > new Date()).slice(0, 6);

    return (
        <>
            {/* Page 2: Loan Health Dashboard */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Loan Health at a Glance</h2>
                <div className="grid grid-cols-2 gap-8 items-center">
                    <div className="flex justify-center">
                        <ProgressRing progress={paidPercentage} />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg border">
                        <h3 className="text-xl font-semibold mb-4">Loan Snapshot</h3>
                        <ul className="space-y-2">
                           <li><strong>Original Amount:</strong> {formatCurrency(originalLoanAmount)}</li>
                           <li className="text-lg"><strong>Outstanding Balance:</strong> <span className="font-bold text-red-600">{formatCurrency(outstandingBalance)}</span></li>
                           <li><strong>Interest Paid to Date:</strong> {formatCurrency(interestPaidToDate)}</li>
                           <li><strong>Current Interest Rate:</strong> {interestRate.toFixed(2)}%</li>
                           <li><strong>Projected Payoff Date:</strong> {isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}</li>
                        </ul>
                    </div>
                </div>
                 <div className="mt-8">
                     <h3 className="text-2xl font-semibold text-center mb-6">How Your Payments Are Applied</h3>
                     <p className="text-center text-sm text-gray-500 -mt-4 mb-4">First 12 months of payments</p>
                     <ResponsiveContainer width="100%" height={250}>
                         <BarChart data={schedule.slice(0, 12)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', {month: 'short'})} />
                            <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                            <Legend />
                            <Bar dataKey="principal" name="Principal" stackId="a" fill="#2563EB" />
                            <Bar dataKey="interest" name="Interest" stackId="a" fill="#FFAB40" />
                         </BarChart>
                     </ResponsiveContainer>
                </div>
            </div>
            
             {/* Page 3: Actionable Insights */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                 <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Take Control of Your Debt</h2>
                 <p className="text-center text-gray-600 mb-8 -mt-4">See how extra payments can accelerate your journey to being debt-free.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                        <h3 className="text-xl font-semibold mb-4 text-green-800">Extra Monthly Payments</h3>
                        <div className="space-y-4">
                            <p>Paying an extra <strong>{formatCurrency(50)} per month</strong> will get you debt-free <strong>{whatIf50.monthsSaved} months sooner</strong> and save you <strong className="text-green-600">{formatCurrency(whatIf50.interestSaved)}</strong> in interest.</p>
                             <hr className="border-gray-300"/>
                            <p>Paying an extra <strong>{formatCurrency(100)} per month</strong> will get you debt-free <strong>{whatIf100.monthsSaved} months sooner</strong> and save you <strong className="text-green-600">{formatCurrency(whatIf100.interestSaved)}</strong> in interest.</p>
                        </div>
                    </div>
                     <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                        <h3 className="text-xl font-semibold mb-4 text-orange-800">Lump-Sum Payment</h3>
                        <div className="space-y-4">
                             <p>Making a <strong>one-time extra payment of {formatCurrency(500)}</strong> will shorten your loan term by <strong>{whatIf500Lump.monthsSaved} months</strong> and save you <strong className="text-orange-600">{formatCurrency(whatIf500Lump.interestSaved)}</strong> in interest.</p>
                        </div>
                    </div>
                </div>
                 <div className="mt-8">
                     <h3 className="text-2xl font-semibold text-center mb-6">Payoff Timeline Comparison</h3>
                     <AmortizationTimelineChart originalTerm={totalMonthsFromNow} scenarios={[
                         { name: '+ $50/mo', months: whatIf50.months},
                         { name: '+ $100/mo', months: whatIf100.months}
                     ]} />
                </div>
            </div>

            {/* Page 4: Action Plan & Upsell */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Recommended Action Plan</h2>

                <div className="bg-gray-50 p-6 rounded-lg border mb-12">
                    <ul className="space-y-4 text-lg">
                        <li className="flex gap-3"><Lightbulb className="text-yellow-400 w-6 h-6 shrink-0 mt-1" /><span>Based on your current rate, you are on track to pay off your loan on <strong>{isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString() : "N/A"}</strong>.</span></li>
                        <li className="flex gap-3"><TrendingUp className="text-green-500 w-6 h-6 shrink-0 mt-1" /><span>By paying an extra <strong>{formatCurrency(100)} per month</strong>, you could be debt-free <strong>{whatIf100.monthsSaved} months sooner</strong> and save <strong className="text-green-500">{formatCurrency(whatIf100.interestSaved)}</strong> in interest.</span></li>
                        <li className="flex gap-3"><Banknote className="text-blue-500 w-6 h-6 shrink-0 mt-1" /><span>Consider applying any bonuses or tax returns directly to your principal balance to maximize savings.</span></li>
                    </ul>
                </div>
                
                 <div className="text-center mt-auto pt-8">
                     <h3 className="text-2xl font-bold font-headline text-primary">From Insight to Action: Stop Calculating and Start Tracking</h3>
                     <p className="text-gray-600 mt-2 max-w-2xl mx-auto">Track your progress in real-time, get payment reminders, and run unlimited 'what-if' scenarios with your LoanZen Tracker Pro dashboard.</p>
                     
                     <div className="mt-6 bg-gray-100 p-6 rounded-lg border">
                        <p className="text-xl font-bold">Your exclusive upgrade offer is in your email.</p>
                        <p className="text-lg mt-2">Use your personal code to start a 14-day free trial now!</p>
                     </div>
                 </div>
            </div>
        </>
    )
}

export default function ReportTemplate({ reportData }: ReportDataType) {
    if (!reportData) return null;

    const { formType, userEmail, generatedAt } = reportData;
    
    // Find the first disbursement date
    let disbursementDate = 'N/A';
    if (reportData.formType === 'existing-loan') {
        const firstDisbursement = reportData.schedule.find(t => t.type === 'disbursement');
        if (firstDisbursement) {
            disbursementDate = new Date(firstDisbursement.date).toLocaleDateString();
        }
    }
    
    return (
        <div className="bg-gray-100 text-gray-800 font-body" style={{width: '800px'}}>
        
        {/* Page 1: Cover */}
        <div className="pdf-page h-full flex flex-col justify-between p-10 bg-white text-gray-800" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='800' height='1120' viewBox='0 0 800 1120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop stop-color='%23F0F9FF' offset='0%25'/%3E%3Cstop stop-color='white' offset='100%25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='1120'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover'
        }}>
          <div className="text-center pt-32">
             <div className="inline-block">
                <Logo />
            </div>
            <p className="text-5xl font-semibold mt-24 font-headline text-blue-900">
              Loan Analysis Report
            </p>
             <div className="mt-16 text-lg text-gray-600">
              <p className="text-2xl">Prepared Exclusively for</p>
              <p className="font-bold text-3xl text-blue-800 mt-2">{userEmail || 'Valued Customer'}</p>
            </div>
             <div className="mt-24 text-sm text-gray-500 space-y-1">
                {formType === 'existing-loan' && (
                    <p><strong>Statement Period:</strong> {disbursementDate} to {new Date(generatedAt).toLocaleDateString()}</p>
                )}
                <p><strong>Date of Generation:</strong> {new Date(generatedAt).toLocaleString()}</p>
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
        
      </div>
    );
}

