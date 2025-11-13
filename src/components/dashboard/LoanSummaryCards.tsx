'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, AlertTriangle, Target } from 'lucide-react';
import type { Loan } from '@/app/dashboard/page';
import { useCurrency } from '@/contexts/currency-context';

interface LoanSummaryCardsProps {
    loans: Loan[];
}

export default function LoanSummaryCards({ loans }: LoanSummaryCardsProps) {
    const { formatCurrency, formatCurrencyWithCode, currency: globalCurrency } = useCurrency();
    
    // Helper to format with loan currency if available
    const formatLoanCurrency = (value: number, loanCurrency?: 'USD' | 'EUR' | 'GBP' | 'INR') => {
      const currencyToUse = (loanCurrency && ['USD', 'EUR', 'GBP', 'INR'].includes(loanCurrency))
        ? loanCurrency
        : globalCurrency;
      return formatCurrencyWithCode(value, currencyToUse);
    };
    
    // For summary cards, we'll use the global currency since we're aggregating across loans
    // (loans might have different currencies, so we use the user's default)
    const totalDebt = loans.reduce((acc, loan) => acc + loan.currentBalance, 0);
    const totalMonthlyPayment = loans.reduce((acc, loan) => acc + loan.monthlyPayment, 0);
    const highestInterestLoan = loans.reduce((prev, current) => (prev.interestRate > current.interestRate) ? prev : current, loans[0] || { interestRate: 0, loanName: 'N/A' });
    const totalOriginalAmount = loans.reduce((acc, loan) => acc + loan.originalLoanAmount, 0);
    const debtPaid = totalOriginalAmount - totalDebt;
    const progress = totalOriginalAmount > 0 ? (debtPaid / totalOriginalAmount) * 100 : 0;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="elevated bg-destructive/5 border-destructive/30 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-semibold text-destructive">Total Debt</CardTitle>
                    <DollarSign className="h-5 w-5 text-destructive/80" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(totalDebt)}</div>
                </CardContent>
            </Card>

            <Card className="elevated bg-primary/5 border-primary/30 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-semibold text-primary">Monthly Payments</CardTitle>
                    <Calendar className="h-5 w-5 text-primary/80" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(totalMonthlyPayment)}</div>
                </CardContent>
            </Card>

            <Card className="elevated bg-yellow-400/5 border-yellow-400/30 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Highest Interest</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-yellow-600/80 dark:text-yellow-400/80" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight text-foreground">{highestInterestLoan?.interestRate || 0}%</div>
                    <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70 truncate mt-2">
                        {highestInterestLoan?.loanName}
                    </div>
                </CardContent>
            </Card>

            <Card className="elevated bg-green-500/5 border-green-500/30 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-semibold text-green-600 dark:text-green-500">Progress</CardTitle>
                    <Target className="h-5 w-5 text-green-600/80 dark:text-green-500/80" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight text-foreground">{Math.round(progress)}%</div>
                    <div className="text-xs text-green-600/70 dark:text-green-500/70 mt-2">
                        Debt freedom
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
