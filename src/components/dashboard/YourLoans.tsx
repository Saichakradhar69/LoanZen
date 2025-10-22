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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Your Loans</CardTitle>
                        <CardDescription>Manage and track your loan portfolio</CardDescription>
                    </div>
                    <Button variant="ghost" onClick={onAddLoan}>
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
                    <div className="text-center py-12 border-2 border-dashed border-secondary rounded-lg">
                        <h3 className="text-lg font-semibold text-muted-foreground">No Loans Added Yet</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-4">Click "Add Loan" to start tracking your debts.</p>
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
