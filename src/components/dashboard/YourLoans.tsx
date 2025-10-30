'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import LoanCard from "@/components/dashboard/LoanCard";
import type { Loan } from '@/app/dashboard/page';

interface YourLoansProps {
    loans: Loan[];
    onAddLoan: () => void;
    onEdit: (loan: Loan) => void;
    onDelete: (loan: Loan) => void;
}

export default function YourLoans({ loans, onAddLoan, onEdit, onDelete }: YourLoansProps) {
    return (
        <Card className="elevated">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">Your Loans</CardTitle>
                        <CardDescription className="mt-1">Manage and track your loan portfolio</CardDescription>
                    </div>
                    <Button variant="ghost" onClick={onAddLoan} className="hover:bg-primary/10">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Loan
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loans.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loans.map(loan => (
                            <LoanCard 
                                key={loan.id} 
                                loan={loan} 
                                onEdit={() => onEdit(loan)}
                                onDelete={() => onDelete(loan)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed border-muted rounded-xl bg-muted/20">
                        <h3 className="text-lg font-semibold text-foreground">No Loans Added Yet</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-6">Click "Add Loan" to start tracking your debts.</p>
                        <Button onClick={onAddLoan}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Loan
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
