'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Loan } from "@/app/dashboard/page";

interface PaymentTimelineProps {
    loans: Loan[];
}

const colorPairs = [
    { primary: 'bg-blue-500', secondary: 'bg-primary/10' },
    { primary: 'bg-red-500', secondary: 'bg-destructive/10' },
    { primary: 'bg-green-500', secondary: 'bg-green-500/10' },
    { primary: 'bg-purple-500', secondary: 'bg-purple-500/10' },
    { primary: 'bg-amber-500', secondary: 'bg-amber-500/10' },
]

export default function PaymentTimeline({ loans }: PaymentTimelineProps) {

    const calculatePayoffYears = (loan: Loan) => {
        if (loan.currentBalance <= 0 || loan.monthlyPayment <= 0) return Infinity;

        const monthlyInterestRate = loan.interestRate / 100 / 12;
        
        // If monthly payment doesn't cover interest, it will never be paid off
        if (loan.monthlyPayment <= loan.currentBalance * monthlyInterestRate) {
            return Infinity;
        }

        // Using the formula for number of payments: n = -log(1 - (P * r) / A) / log(1 + r)
        const P = loan.currentBalance;
        const A = loan.monthlyPayment;
        const r = monthlyInterestRate;

        const months = -(Math.log(1 - (P * r) / A)) / Math.log(1 + r);
        
        return months / 12;
    }

    return (
        <Card className="elevated">
            <CardHeader>
                <CardTitle className="text-xl">Payment Timeline</CardTitle>
                <CardDescription className="mt-1">Visual overview of your loan payoff schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {loans.map((loan, index) => {
                    const payoffYears = calculatePayoffYears(loan);
                    const color = colorPairs[index % colorPairs.length];

                    return (
                        <div key={loan.id} className={`p-4 rounded-xl border ${color.secondary} hover:shadow-sm transition-shadow`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${color.primary}`}></div>
                                    <span className="font-semibold">{loan.loanName}</span>
                                </div>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {isFinite(payoffYears) ? `Paid off in ${payoffYears.toFixed(1)} years` : 'Payoff date uncertain'}
                                </span>
                            </div>
                        </div>
                    );
                })}
                 {loans.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Add a loan to see its payment timeline.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
