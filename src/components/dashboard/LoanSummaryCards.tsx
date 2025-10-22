
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Calendar, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import type { Loan } from '@/app/dashboard/page';

interface LoanSummaryCardsProps {
    loans: Loan[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function LoanSummaryCards({ loans }: LoanSummaryCardsProps) {
    const totalDebt = loans.reduce((acc, loan) => acc + loan.currentBalance, 0);
    const totalMonthlyPayment = loans.reduce((acc, loan) => acc + loan.monthlyPayment, 0);
    const highestInterestLoan = loans.reduce((prev, current) => (prev.interestRate > current.interestRate) ? prev : current, loans[0] || { interestRate: 0 });
    const totalOriginalAmount = loans.reduce((acc, loan) => acc + loan.originalLoanAmount, 0);
    const debtPaid = totalOriginalAmount - totalDebt;
    const progress = totalOriginalAmount > 0 ? (debtPaid / totalOriginalAmount) * 100 : 0;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">Total Debt</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalDebt)}</div>
                    <p className="text-xs text-red-600 dark:text-red-400">
                        Across {loans.length} loan(s)
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Monthly Payments</CardTitle>
                    <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totalMonthlyPayment)}</div>
                     <p className="text-xs text-blue-600 dark:text-blue-400">
                        Your total monthly obligation
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Highest Interest</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{highestInterestLoan?.interestRate || 0}%</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 truncate">
                        {highestInterestLoan?.loanName || 'N/A'}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Payoff Progress</CardTitle>
                    <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">{Math.round(progress)}%</div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                        Towards debt freedom
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
