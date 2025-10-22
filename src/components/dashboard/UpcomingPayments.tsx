'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Loan } from "@/app/dashboard/page";
import { differenceInDays, addMonths, setDate, isAfter } from 'date-fns';

interface UpcomingPaymentsProps {
    loans: Loan[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function UpcomingPayments({ loans }: UpcomingPaymentsProps) {
    
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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Upcoming Payments</CardTitle>
                <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {upcoming.map(loan => (
                    <div key={loan.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-sm">{loan.loanName}</p>
                            <p className="text-xs text-muted-foreground">Due in {loan.paymentInfo.daysUntil} day{loan.paymentInfo.daysUntil !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-bold text-sm">{formatCurrency(loan.monthlyPayment)}</p>
                             {loan.paymentInfo.daysUntil < 7 ? (
                                <Badge variant="destructive" className="text-xs">Urgent</Badge>
                             ) : (
                                <Badge variant="secondary" className="text-xs text-yellow-300 border-yellow-500/50">Soon</Badge>
                             )}
                        </div>
                    </div>
                ))}
                 {upcoming.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No payments due in the next 30 days.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
