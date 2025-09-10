
'use client'

import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import type { CalculationResults as ReportDataType, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';
import { Landmark } from 'lucide-react';


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

const interestTypeLabels: { [key:string]: string } = {
    reducing: 'Reducing Balance',
    flat: 'Flat Rate',
};

const NewLoanReport = ({ reportData }: { reportData: NewLoanCalculationResults }) => {
    const { scenarios, userEmail, generatedAt, loanName } = reportData;
    const bestScenario = scenarios.length > 1 ? [...scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0] : scenarios[0];
    const worstScenario = scenarios.length > 1 ? [...scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0] : scenarios[0];
    const hasMultipleScenarios = scenarios.length > 1;

    const summaryData = scenarios.map(s => ({
        name: `${s.scenarioName} @ ${s.interestRate}%`,
        'Total Cost': s.totalPayment,
        'Principal': s.loanAmount,
        'Total Interest': s.totalInterest
    }));

     return (
        <>
            {/* Page 2: Executive Summary */}
            <div className="pdf-page h-full flex flex-col p-10 pt-12">
              <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8">Executive Summary</h2>
              
              {hasMultipleScenarios && (
                <>
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8">
                    <h3 className="text-xl font-semibold text-blue-900">Recommendation</h3>
                    <p className="mt-2 text-lg">Based on your comparison, the "<strong>{bestScenario.scenarioName} @ {bestScenario.interestRate}%</strong>" is the most cost-effective option.</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-8">
                      <h3 className="text-xl font-semibold text-green-900">Key Finding</h3>
                      <p className="mt-2 text-lg">Choosing this option could save you <strong className="text-2xl">{formatCurrency(worstScenario.totalInterest - bestScenario.totalInterest)}</strong> in total interest over the loan's term.</p>
                  </div>
                </>
              )}
              {!hasMultipleScenarios && (
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8">
                    <h3 className="text-xl font-semibold text-blue-900">Loan Overview: {bestScenario.scenarioName}</h3>
                    <p className="mt-2 text-lg">Based on your loan details, here is your projected repayment summary.</p>
                  </div>
              )}
              
              <h3 className="text-2xl font-semibold mb-4">Financial Summary</h3>
              <table className="w-full text-left table-auto">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 font-semibold">Metric</th>
                    {scenarios.map(s => <th key={s.scenarioName} className="p-3 font-semibold text-right">{s.scenarioName} @ {s.interestRate}%</th>)}
                    {hasMultipleScenarios && <th className="p-3 font-semibold text-right">Difference</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3">Monthly Payment</td>
                    {scenarios.map(s => <td key={s.scenarioName} className="p-3 text-right">{formatCurrency(s.monthlyPayment)}</td>)}
                    {hasMultipleScenarios && <td className="p-3 text-right">{formatCurrency(Math.abs(bestScenario.monthlyPayment - worstScenario.monthlyPayment))}</td>}
                  </tr>
                   <tr className="border-b">
                    <td className="p-3">Total Interest Paid</td>
                    {scenarios.map(s => <td key={s.scenarioName} className="p-3 text-right text-red-600">{formatCurrency(s.totalInterest)}</td>)}
                    {hasMultipleScenarios && <td className="p-3 text-right text-red-600">{formatCurrency(Math.abs(bestScenario.totalInterest - worstScenario.totalInterest))}</td>}
                  </tr>
                   <tr className="border-b">
                    <td className="p-3 font-bold">Total Cost of Loan</td>
                    {scenarios.map(s => <td key={s.scenarioName} className="p-3 text-right font-bold">{formatCurrency(s.totalPayment)}</td>)}
                    {hasMultipleScenarios && <td className="p-3 text-right font-bold">{formatCurrency(Math.abs(bestScenario.totalPayment - worstScenario.totalPayment))}</td>}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Page 3: Visual Breakdown */}
            <div className="pdf-page h-full flex flex-col p-10 pt-16">
              <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-12">Visual Breakdown</h2>
              
              {hasMultipleScenarios && (
                <div className="mb-12">
                  <h3 className="text-2xl font-semibold text-center mb-6">Total Cost Comparison</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(val) => formatCurrency(val as number)}/>
                      <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                      <Legend />
                      <Bar dataKey="Total Cost" fill="#3F51B5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {scenarios.map((scenario) => {
                  const pieData = [
                    { name: 'Principal', value: scenario.loanAmount },
                    { name: 'Total Interest', value: scenario.totalInterest },
                  ];
                  return (
                     <div key={scenario.scenarioName}>
                        <h3 className="text-2xl font-semibold text-center mb-6">Principal vs. Interest ({scenario.scenarioName})</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3F51B5', '#FFAB40'][index % 2]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val as number)}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Page 4: Amortization Schedule */}
            {scenarios.map(scenario => (
               <div key={scenario.scenarioName} className="pdf-page h-full flex flex-col p-10 pt-16">
                  <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8">
                      Amortization Schedule: {scenario.scenarioName}
                  </h2>
                   <table className="w-full text-left text-sm table-auto">
                       <thead className="bg-gray-100">
                          <tr>
                              <th className="p-2">Month</th>
                              <th className="p-2 text-right">Payment</th>
                              <th className="p-2 text-right">Principal</th>
                              <th className="p-2 text-right">Interest</th>
                              <th className="p-2 text-right">Balance</th>
                          </tr>
                       </thead>
                       <tbody>
                          {scenario.amortizationSchedule.slice(0, 12).map(row => (
                              <tr key={row.month} className="border-b">
                                  <td className="p-2">{row.month}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.monthlyPayment)}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.principal)}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.interest)}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.remainingBalance)}</td>
                              </tr>
                          ))}
                          {scenario.amortizationSchedule.length > 24 && (
                              <tr>
                                  <td colSpan={5} className="text-center p-4">...</td>
                              </tr>
                          )}
                          {scenario.amortizationSchedule.slice(-12).map(row => (
                               <tr key={row.month} className="border-b">
                                  <td className="p-2">{row.month}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.monthlyPayment)}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.principal)}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.interest)}</td>
                                  <td className="p-2 text-right">{formatCurrency(row.remainingBalance)}</td>
                              </tr>
                          ))}
                       </tbody>
                   </table>
                    <p className="text-center text-sm text-gray-500 mt-4">
                      A full amortization schedule is available in the accompanying CSV file.
                    </p>
               </div>
            ))}
        </>
     )
}


const ExistingLoanReport = ({ reportData }: { reportData: ExistingLoanReportResults }) => {
    const {
        loanName, loanType, interestType, originalLoanAmount,
        outstandingBalance, interestPaidToDate, nextEmiDate,
        schedule,
    } = reportData;

    const summaryData = [
        { name: 'Original Principal', value: originalLoanAmount },
        { name: 'Principal Paid', value: originalLoanAmount - outstandingBalance },
        { name: 'Interest Paid', value: interestPaidToDate },
    ];
    
    const balanceData = [
        { name: 'Outstanding Principal', value: outstandingBalance },
        { name: 'Interest Paid to Date', value: interestPaidToDate },
    ]

    return (
        <>
            {/* Page 2: Executive Summary */}
            <div className="pdf-page h-full flex flex-col p-10 pt-12">
                <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8">Loan Statement Summary</h2>
                
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8">
                  <h3 className="text-xl font-semibold text-blue-900">Loan Status for: {loanName || loanTypeLabels[loanType]}</h3>
                  <p className="mt-2 text-lg">As of {new Date().toLocaleDateString()}, here is the summary of your loan account.</p>
                </div>

                <h3 className="text-2xl font-semibold mb-4">Financial Summary</h3>
                <table className="w-full text-left table-auto">
                    <tbody>
                        <tr className="border-b">
                            <td className="p-3 font-semibold">Current Outstanding Balance</td>
                            <td className="p-3 text-right text-2xl font-bold text-red-600">{formatCurrency(outstandingBalance)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-3 font-semibold">Total Interest Paid to Date</td>
                            <td className="p-3 text-right">{formatCurrency(interestPaidToDate)}</td>
                        </tr>
                         <tr className="border-b">
                            <td className="p-3 font-semibold">Next Payment Due Date</td>
                            <td className="p-3 text-right">{nextEmiDate ? new Date(nextEmiDate).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                         <tr className="border-b">
                            <td className="p-3 font-semibold">Original Loan Amount</td>
                            <td className="p-3 text-right">{formatCurrency(originalLoanAmount)}</td>
                        </tr>
                         <tr className="border-b">
                            <td className="p-3 font-semibold">Interest Type</td>
                            <td className="p-3 text-right">{interestTypeLabels[interestType]}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Page 3: Amortization Schedule */}
            {schedule && schedule.length > 0 && (
                 <div className="pdf-page h-full flex flex-col p-10 pt-16">
                    <h2 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-800 pb-2 mb-8">
                        Transaction History
                    </h2>
                     <table className="w-full text-left text-sm table-auto">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2">Date</th>
                                <th className="p-2">Transaction</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2 text-right">Principal</th>
                                <th className="p-2 text-right">Interest</th>
                                <th className="p-2 text-right">Balance</th>
                            </tr>
                         </thead>
                         <tbody>
                            {schedule.slice(0, 24).map((row, index) => (
                                <tr key={index} className="border-b">
                                    <td className="p-2">{row.date}</td>
                                    <td className="p-2 capitalize">{row.type}</td>
                                    <td className="p-2 text-right">{formatCurrency(row.amount)}</td>
                                    <td className="p-2 text-right">{formatCurrency(row.principal)}</td>
                                    <td className="p-2 text-right">{formatCurrency(row.interest)}</td>
                                    <td className="p-2 text-right">{formatCurrency(row.endingBalance)}</td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                      <p className="text-center text-sm text-gray-500 mt-4">
                        Showing up to 24 recent transactions. A full transaction history is available in the accompanying CSV file.
                      </p>
                 </div>
            )}
        </>
    )
}

export default function ReportTemplate({ reportData }: ReportTemplateProps) {
    if (!reportData) return null;

    const { formType, userEmail, generatedAt } = reportData;
    
    return (
        <div className="bg-white text-gray-800 font-sans" style={{width: '800px'}}>
        {/* Page 1: Cover */}
        <div className="pdf-page h-full flex flex-col justify-between p-10">
          <div className="text-center pt-24">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Landmark className="h-16 w-16 text-blue-800" />
              <h1 className="text-6xl font-bold text-blue-900 tracking-tight">LoanZen</h1>
            </div>
            <p className="text-3xl font-semibold mt-12">
                {formType === 'new-loan' ? 'Loan Comparison Analysis Report' : 'Existing Loan Statement'}
            </p>
            <div className="mt-24 text-lg">
              <p>Prepared for: {userEmail || 'Valued Customer'}</p>
              <p>Date Generated: {new Date(generatedAt).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 pb-4">
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
