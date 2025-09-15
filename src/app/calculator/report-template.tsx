

'use client'

import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Line, ComposedChart, Area, LabelList } from 'recharts';
import type { CalculationResults as ReportDataType, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';
import { Banknote, CalendarCheck, Check, Gift, Lightbulb, TrendingUp } from 'lucide-react';
import Logo from '@/components/logo';
import { Progress } from '@/components/ui/progress';


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
    if (principal <= 0) {
        return { months: 0, totalInterest: 0, years: 0, monthsSaved: baseMonths, interestSaved: baseInterest };
    }
    const monthlyRate = annualRate / 12 / 100;
    let balance = principal - lumpSum;
    let months = 0;
    let totalInterest = 0;

    const fullPayment = monthlyPayment + extraMonthly;

    if (lumpSum > 0 && balance <=0) { // Paid off with lump sum
         return { months: 0, totalInterest: 0, years: 0, monthsSaved: baseMonths, interestSaved: baseInterest };
    }
    
    // If the monthly payment is less than or equal to the interest, it will never be paid off.
    if (fullPayment <= balance * monthlyRate) {
        return { months: Infinity, totalInterest: Infinity, years: Infinity, monthsSaved: 0, interestSaved: 0 };
    }


    while (balance > 0) {
        const interest = balance * monthlyRate;
        const principalPaid = fullPayment - interest;

        balance -= principalPaid;
        totalInterest += interest;
        months++;
        if (months > 1200) return { months: Infinity, totalInterest: Infinity, years: Infinity, monthsSaved: 0, interestSaved: 0 }; // Safety break
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
            <div className="absolute flex flex-col items-center justify-center text-center">
                 <span className="text-4xl font-bold text-gray-700">{`${Math.round(progress)}%`}</span>
                 <span className="text-base text-gray-500 max-w-[100px] leading-tight">% of Principal Paid</span>
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
        <div className="w-[95%] mx-auto">
        <ResponsiveContainer width="100%" height={150 + (validScenarios.length * 20)}>
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

    const whatIfScenarios = [
      { name: '+ $50/mo', months: whatIf50.months},
      { name: '+ $100/mo', months: whatIf100.months}
    ].filter(s => isFinite(s.months) && s.months > 0);


    return (
        <>
            {/* Page 2: Executive Summary */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">
                    {hasMultipleScenarios ? "Your Recommended Path" : "Your Loan Health Snapshot"}
                </h2>
                {hasMultipleScenarios && (
                    <div className="text-center bg-green-50/50 p-6 rounded-lg mb-8">
                        <p className="text-xl text-green-800">Based on our analysis, you could save:</p>
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
                        {isFinite(whatIf50.months) && whatIf50.monthsSaved > 0 && <p>If you pay an extra <strong>{formatCurrency(50)}/month</strong>, you will be debt-free <strong>{whatIf50.monthsSaved.toFixed(0)} months sooner</strong> and save <strong>{formatCurrency(whatIf50.interestSaved)}</strong> in interest.</p>}
                        {isFinite(whatIf100.months) && whatIf100.monthsSaved > 0 && <p>If you pay an extra <strong>{formatCurrency(100)}/month</strong>, you will be debt-free <strong>{whatIf100.monthsSaved.toFixed(0)} months sooner</strong> and save <strong>{formatCurrency(whatIf100.interestSaved)}</strong> in interest.</p>}
                    </div>
                </div>
            </div>

            {/* Page 3: Visual Comparison */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
              <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Visual Breakdown of Your Options</h2>
                <div className="mb-12">
                    <h3 className="text-2xl font-semibold text-center mb-6">Paydown Timeline</h3>
                    <div className="w-[95%] mx-auto">
                        <ResponsiveContainer width="100%" height={400}>
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
             <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Accelerated Payoff Comparison</h2>
                <div className="mt-8">
                     <h3 className="text-2xl font-semibold text-center mb-6">Amortization Timeline with Extra Payments</h3>
                     <AmortizationTimelineChart originalTerm={baseMonths} scenarios={whatIfScenarios} />
                </div>
            </div>

             {/* Page 4: Action Plan & Upsell */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Recommended Action Plan</h2>

                <div className="bg-gray-50 p-6 rounded-lg border mb-12">
                     <h3 className="text-xl font-bold text-gray-800 mb-4">Based on your report, here are your next steps:</h3>
                    <ul className="space-y-4 text-lg">
                        <li className="flex gap-3"><Check className="text-green-500 w-6 h-6 shrink-0 mt-1" /><span>Review your options and select the "{bestScenario.scenarioName}" for the most savings.</span></li>
                         {isFinite(whatIf50.months) && whatIf50.interestSaved > 0 && <li className="flex gap-3"><Check className="text-green-500 w-6 h-6 shrink-0 mt-1" /><span>Consider paying an extra <strong>{formatCurrency(50)}/month</strong>. This small change will save you <strong>{formatCurrency(whatIf50.interestSaved)}!</strong></span></li>}
                    </ul>
                </div>
                
                 <div className="text-center mt-auto pt-8">
                     <h3 className="text-2xl font-bold font-headline text-primary">From Insight to Action: Stop Calculating and Start Tracking</h3>
                     <p className="text-gray-600 mt-2 max-w-2xl mx-auto">Track your progress in real-time, get payment reminders, and run unlimited 'what-if' scenarios with your LoanZen Tracker Pro dashboard.</p>
                     
                     <div className="mt-6 bg-gray-100 p-6 rounded-lg border">
                        <p className="text-xl font-bold">Your exclusive upgrade offer is in your email.</p>
                        <p className="text-lg mt-2">Use your personal code for a <span className="font-extrabold text-green-600">14-DAY FREE TRIAL!</span></p>
                     </div>
                 </div>
            </div>
        </>
     )
}


const ExistingLoanReport = ({ reportData }: { reportData: ExistingLoanReportResults }) => {
    const { originalLoanAmount, outstandingBalance, interestPaidToDate, schedule, interestRate, nextEmiDate, perDayInterest } = reportData;
    const paidAmount = originalLoanAmount - outstandingBalance;
    const paidPercentage = originalLoanAmount > 0 ? (paidAmount / originalLoanAmount) * 100 : 0;
    
    const lastRepayment = [...schedule].reverse().find(s => s.type === 'repayment');
    const baseMonthlyPayment = lastRepayment ? lastRepayment.amount : (outstandingBalance > 0 ? outstandingBalance / 120 : originalLoanAmount / 120); 

    const baseScenario = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, 0, 0); // Base case to get months and interest from now
    const totalInterestFromNow = isFinite(baseScenario.totalInterest) ? baseScenario.totalInterest : 0;
    const totalMonthsFromNow = isFinite(baseScenario.months) ? baseScenario.months : 0;
    
    const projectedPayoffDate = new Date();
    if (isFinite(totalMonthsFromNow)) {
        projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + totalMonthsFromNow);
    }
    
    const firstDisbursement = reportData.schedule.find(t => t.type === 'disbursement');
    const loanStartDate = firstDisbursement ? new Date(firstDisbursement.date) : new Date(reportData.generatedAt);
    
    const loanTenureYears = Math.ceil(totalMonthsFromNow / 12) + Math.floor((new Date().getTime() - loanStartDate.getTime()) / (1000 * 3600 * 24 * 365.25));

    // What-if scenarios
    const whatIf50 = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 50);
    const whatIf100 = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 100);
    const whatIf500Lump = calculateWhatIf(outstandingBalance, baseMonthlyPayment, interestRate, totalMonthsFromNow, totalInterestFromNow, 0, 500);

    const interestPieData = [
        { name: 'Principal Paid', value: paidAmount },
        { name: 'Interest Paid', value: interestPaidToDate },
    ];
    const principalPaidToDate = originalLoanAmount - outstandingBalance;
    
    const whatIfScenarios = [
      { name: '+ $50/mo', months: whatIf50.months},
      { name: '+ $100/mo', months: whatIf100.months}
    ].filter(s => isFinite(s.months) && s.months > 0);

    // Data for the paydown timeline chart
    const timelineData = schedule.filter(s => s.type === 'disbursement' || s.type === 'repayment' || s.type === 'interest')
        .map(s => ({ date: new Date(s.date).getTime(), balance: s.endingBalance }));

    // Total cost calculation
    const totalProjectedCost = originalLoanAmount + totalInterestFromNow;
    const totalPaidToDate = principalPaidToDate + interestPaidToDate;
    const totalCostProgress = totalProjectedCost > 0 ? (totalPaidToDate / totalProjectedCost) * 100 : 0;


    return (
        <>
            {/* Page 2: Loan Health Dashboard */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Loan Health at a Glance</h2>
                 <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-4">
                    <div className="space-y-1">
                        <p className="text-sm text-gray-500">Loan Type</p>
                        <p className="font-semibold">{loanTypeLabels[reportData.loanType] || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-500">Original Loan Amount</p>
                        <p className="font-semibold">{formatCurrency(reportData.originalLoanAmount)}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-sm text-gray-500">Interest Rate</p>
                        <p className="font-semibold">{reportData.interestRate.toFixed(2)}%</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-sm text-gray-500">Loan Tenure</p>
                        <p className="font-semibold">{loanTenureYears > 0 ? `${loanTenureYears} Years` : 'N/A'}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-sm text-gray-500">Monthly Payment (EMI)</p>
                        <p className="font-semibold">{baseMonthlyPayment > 0 ? formatCurrency(baseMonthlyPayment) : 'N/A'}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="text-sm text-gray-500">Loan Period</p>
                        <p className="font-semibold">{loanStartDate.toLocaleDateString()} - {isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="flex justify-center">
                        <ProgressRing progress={paidPercentage} />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg border">
                        <h3 className="text-xl font-semibold mb-4">Key Stats</h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Original Amount</p>
                                <p className="font-semibold">{formatCurrency(originalLoanAmount)}</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Outstanding Balance</p>
                                <p className="font-semibold text-red-600">{formatCurrency(outstandingBalance)}</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Principal Paid</p>
                                <p className="font-semibold">{formatCurrency(principalPaidToDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Interest Paid</p>
                                <p className="font-semibold">{formatCurrency(interestPaidToDate)}</p>
                            </div>
                             <div className="col-span-2 border-t mt-2 pt-2"></div>
                            <div>
                                <p className="text-sm text-gray-500">Next EMI Date</p>
                                <p className="font-semibold">{nextEmiDate ? new Date(nextEmiDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Projected Payoff</p>
                                <p className="font-semibold">{isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Per Day Interest</p>
                                <p className="font-semibold">{formatCurrency(perDayInterest)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <h3 className="text-xl font-semibold text-center mb-4">Total Lifetime Cost Breakdown</h3>
                     <div className="bg-gray-50 p-6 rounded-lg border">
                         <div className="flex justify-between mb-2 text-sm">
                           <span>Paid to Date: {formatCurrency(totalPaidToDate)}</span>
                           <span>Total Projected Cost (Principal + Interest): {formatCurrency(totalProjectedCost)}</span>
                         </div>
                         <Progress value={totalCostProgress} />
                         <p className="text-center text-sm text-gray-500 mt-2">{totalCostProgress.toFixed(1)}% of total lifetime cost paid</p>
                     </div>
                </div>
            </div>

            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                 <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Financial Overview</h2>
                 <div className="mb-12">
                    <h3 className="text-2xl font-semibold text-center mb-4">Where Your Money Has Gone (To Date)</h3>
                    <div className="w-[95%] mx-auto">
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie data={interestPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return ( <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"> {`${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`} </text> );
                                }}>
                                    <Cell fill="#2563EB" />
                                    <Cell fill="#FFAB40" />
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val as number)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="text-center mt-6 bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold">Insight:</p>
                        <p className="text-sm text-gray-600">In the early stages of your loan, a larger portion of your payment goes toward interest. As you pay down the principal, this ratio will shift.</p>
                     </div>
                 </div>
            </div>
            
             {/* Page 3: Actionable Insights */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                 <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Take Control of Your Debt</h2>
                 
                 <div className="mb-8">
                     <h3 className="text-2xl font-semibold text-center mb-4">Your Paydown Timeline</h3>
                     <div className="w-[95%] mx-auto">
                        <ResponsiveContainer width="100%" height={400}>
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

                 <p className="text-center text-gray-600 mb-8">See how extra payments can accelerate your journey to being debt-free.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                        <h3 className="text-xl font-semibold mb-4 text-green-800">Extra Monthly Payments</h3>
                        <div className="space-y-4">
                            {isFinite(whatIf50.months) && whatIf50.monthsSaved > 0 && <p><span className="font-bold">Pay an extra {formatCurrency(50)} per month:</span><br/>🕐 Pay off <strong>{whatIf50.monthsSaved.toFixed(0)} months sooner</strong><br/>💰 Save <strong className="text-green-600">{formatCurrency(whatIf50.interestSaved)}</strong> in interest.</p>}
                            {isFinite(whatIf50.months) && whatIf50.monthsSaved > 0 && <hr className="border-gray-300"/>}
                            {isFinite(whatIf100.months) && whatIf100.monthsSaved > 0 && <p><span className="font-bold">Pay an extra {formatCurrency(100)} per month:</span><br/>🕐 Pay off <strong>{whatIf100.monthsSaved.toFixed(0)} months sooner</strong><br/>💰 Save <strong className="text-green-600">{formatCurrency(whatIf100.interestSaved)}</strong> in interest.</p>}
                        </div>
                    </div>
                     <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                        <h3 className="text-xl font-semibold mb-4 text-orange-800">Lump-Sum Payment</h3>
                        <div className="space-y-4">
                             {isFinite(whatIf500Lump.months) && whatIf500Lump.monthsSaved > 0 && <p><span className="font-bold">Make a one-time {formatCurrency(500)} payment:</span><br/>🕐 Shorten loan by <strong>{whatIf500Lump.monthsSaved.toFixed(0)} months</strong><br/>💰 Save <strong className="text-orange-600">{formatCurrency(whatIf500Lump.interestSaved)}</strong> in interest.</p>}
                        </div>
                    </div>
                </div>
            </div>
             <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Accelerated Payoff Comparison</h2>
                 <div className="mt-8">
                     <h3 className="text-2xl font-semibold text-center mb-6">How Extra Payments Shorten Your Loan Term</h3>
                     <AmortizationTimelineChart originalTerm={totalMonthsFromNow} scenarios={whatIfScenarios} />
                </div>
            </div>

            {/* Page 4: Action Plan & Upsell */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16 bg-white text-gray-800">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8 font-headline">Your Recommended Action Plan</h2>

                <div className="bg-gray-50 p-6 rounded-lg border mb-12">
                     <h3 className="text-xl font-bold text-gray-800 mb-4">Based on your report, here are your next steps:</h3>
                    <ul className="space-y-4 text-lg">
                       {isFinite(whatIf50.interestSaved) && whatIf50.interestSaved > 200 && <li className="flex gap-3"><Check className="text-green-500 w-6 h-6 shrink-0 mt-1" /><span>Schedule an extra <strong>{formatCurrency(50)}</strong> payment this month. This can save you over <strong>{formatCurrency(whatIf50.interestSaved)}!</strong></span></li>}
                        <li className="flex gap-3"><Check className="text-green-500 w-6 h-6 shrink-0 mt-1" /><span>Set up payment reminders for your due date to avoid late fees.</span></li>
                        <li className="flex gap-3"><Check className="text-green-500 w-6 h-6 shrink-0 mt-1" /><span>Use your Tracker Pro account to set a custom payoff goal.</span></li>
                    </ul>
                </div>
                
                 <div className="text-center mt-auto pt-8">
                     <h3 className="text-2xl font-bold font-headline text-primary">From Insight to Action: Stop Calculating and Start Tracking</h3>
                     <p className="text-gray-600 mt-2 max-w-2xl mx-auto">Track your progress in real-time, get payment reminders, and run unlimited 'what-if' scenarios with your LoanZen Tracker Pro dashboard.</p>
                     
                     <div className="mt-6 bg-gray-100 p-6 rounded-lg border">
                        <p className="text-xl font-bold">Your exclusive upgrade offer is in your email.</p>
                        <p className="text-lg mt-2">Use your personal code for a <span className="font-extrabold text-green-600">14-DAY FREE TRIAL!</span></p>
                     </div>
                 </div>
            </div>
        </>
    )
}

export default function ReportTemplate({ reportData }: ReportTemplateProps) {
    if (!reportData) return null;

    const { formType, userEmail, generatedAt, couponCode } = reportData;
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
        <div className="pdf-page h-full flex flex-col justify-between p-10 bg-white text-gray-800" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='800' height='1120' viewBox='0 0 800 1120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop stop-color='%23F0F9FF' offset='0%25'/%3E%3Cstop stop-color='white' offset='100%25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='1120'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover'
        }}>
          <div className="text-center pt-32">
             <div className="inline-block">
                <Logo />
            </div>
            <p className="text-5xl font-semibold mt-24 font-headline text-blue-900">
              {formType === 'new-loan' ? 'Loan Comparison Report' : 'Loan Health Statement'}
            </p>
             <div className="mt-16 text-lg text-gray-600">
              <p className="text-2xl">Prepared Exclusively for</p>
              <p className="font-bold text-3xl text-blue-800 mt-2">{userEmail || 'Valued Customer'}</p>
            </div>
             <div className="mt-24 text-sm text-gray-500 space-y-1">
                {sessionId && <p><strong>Report ID:</strong> {sessionId}</p>}
                <p><strong>Statement Period:</strong> {disbursementDate} to {new Date(generatedAt).toLocaleDateString()}</p>
                <p><strong>Date of Generation:</strong> {new Date(generatedAt).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 pb-4 max-w-lg mx-auto">
              This report is for informational purposes only. For exact figures, please consult your loan servicer. This report is based on user-provided data as of {new Date(generatedAt).toLocaleDateString()}.
          </p>
        </div>

        {formType === 'new-loan' 
            ? <NewLoanReport reportData={reportData as NewLoanCalculationResults} />
            : <ExistingLoanReport reportData={reportData as ExistingLoanReportResults} />
        }
        
      </div>
    );
}



    

    


