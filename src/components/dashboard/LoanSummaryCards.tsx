'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Calendar, TrendingUp, AlertTriangle, Target, Percent } from 'lucide-react';
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
    const highestInterestLoan = loans.reduce((prev, current) => (prev.interestRate > current.interestRate) ? prev : current, loans[0] || { interestRate: 0, loanName: 'N/A' });
    const totalOriginalAmount = loans.reduce((acc, loan) => acc + loan.originalLoanAmount, 0);
    const debtPaid = totalOriginalAmount - totalDebt;
    const progress = totalOriginalAmount > 0 ? (debtPaid / totalOriginalAmount) * 100 : 0;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-red-900/20 border-red-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-200/80">Total Debt</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-300" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-100">{formatCurrency(totalDebt)}</div>
                    <p className="text-xs text-red-300/70 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> -2.3% from last month
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-blue-900/20 border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-200/80">Monthly Payments</CardTitle>
                    <Calendar className="h-4 w-4 text-blue-300" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-100">{formatCurrency(totalMonthlyPayment)}</div>
                     <p className="text-xs text-blue-300/70 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +$120 this month
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-yellow-900/20 border-yellow-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-200/80">Highest Interest</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-300" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-100">{highestInterestLoan?.interestRate || 0}%</div>
                    <div className="text-xs text-yellow-300/70 truncate">
                        {highestInterestLoan?.loanName}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-green-900/20 border-green-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-200/80">Progress</CardTitle>
                    <Target className="h-4 w-4 text-green-300" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-100">{Math.round(progress)}%</div>
                    <div className="text-xs text-green-300/70">
                        Debt freedom
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
