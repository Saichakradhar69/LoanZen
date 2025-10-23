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
            <Card className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-destructive">Total Debt</CardTitle>
                    <DollarSign className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(totalDebt)}</div>
                    <p className="text-xs text-destructive/80 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> -2.3% from last month
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20 text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Monthly Payments</CardTitle>
                    <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(totalMonthlyPayment)}</div>
                     <p className="text-xs text-primary/80 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +$120 this month
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-yellow-400/10 border-yellow-400/20 text-yellow-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Highest Interest</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{highestInterestLoan?.interestRate || 0}%</div>
                    <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80 truncate">
                        {highestInterestLoan?.loanName}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20 text-green-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-500">Progress</CardTitle>
                    <Target className="h-4 w-4 text-green-600 dark:text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{Math.round(progress)}%</div>
                    <div className="text-xs text-green-600/80 dark:text-green-500/80">
                        Debt freedom
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
