'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Loan } from "@/app/dashboard/page";
import { differenceInDays, addMonths, setDate, isAfter } from 'date-fns';
import { useCurrency } from '@/contexts/currency-context';

interface UpcomingPaymentsProps {
    loans: Loan[];
}

export default function UpcomingPayments({ loans }: UpcomingPaymentsProps) {
    const { formatCurrency, formatCurrencyWithCode, currency: globalCurrency } = useCurrency();
    
    // Helper to format with loan currency if available
    const formatLoanCurrency = (value: number, loanCurrency?: 'USD' | 'EUR' | 'GBP' | 'INR') => {
      const currencyToUse = (loanCurrency && ['USD', 'EUR', 'GBP', 'INR'].includes(loanCurrency))
        ? loanCurrency
        : globalCurrency;
      return formatCurrencyWithCode(value, currencyToUse);
    };
    
    const getNextPaymentDate = (loan: Loan) => {
        const today = new Date();
        const dueDay = loan.paymentDueDay || 1;
        
        let nextPayment = setDate(today, dueDay);
        
        // If the due day for this month has already passed, get next month's due date
        if (isAfter(today, nextPayment)) {
            nextPayment = addMonths(nextPayment, 1);
        }

        return {
            date: nextPayment,
            daysUntil: differenceInDays(nextPayment, today)
        };
    }

    const upcoming = loans
        .map(loan => ({
            ...loan,
            paymentInfo: getNextPaymentDate(loan),
        }))
        .filter(loan => loan.paymentInfo.daysUntil <= 30)
        .sort((a, b) => a.paymentInfo.daysUntil - b.paymentInfo.daysUntil);

    return (
        <Card className="elevated">
            <CardHeader>
                <CardTitle className="text-xl">Upcoming Payments</CardTitle>
                <CardDescription className="mt-1">Next 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {upcoming.map(loan => (
                    <div key={loan.id} className="flex items-center justify-between p-3 rounded-xl border bg-card/60 hover:bg-card/80 transition-colors">
                        <div>
                            <p className="font-semibold text-sm">{loan.loanName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Due in {loan.paymentInfo.daysUntil} day{loan.paymentInfo.daysUntil !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-bold text-base">{formatLoanCurrency(loan.monthlyPayment, loan.currency)}</p>
                             {loan.paymentInfo.daysUntil < 7 ? (
                                <Badge variant="destructive" className="text-xs mt-1">Urgent</Badge>
                             ) : (
                                <Badge variant="secondary" className="text-xs mt-1 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">Soon</Badge>
                             )}
                        </div>
                    </div>
                ))}
                 {upcoming.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No payments due in the next 30 days.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
