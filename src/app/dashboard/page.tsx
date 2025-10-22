
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, doc } from 'firebase/firestore';
import { Plus, Loader2 } from 'lucide-react';
import AddLoanDialog from "@/components/dashboard/AddLoanDialog";
import LoanSummaryCards from "@/components/dashboard/LoanSummaryCards";
import LoanCard from "@/components/dashboard/LoanCard";

export interface Loan {
  id: string;
  loanName: string;
  loanType: string;
  originalLoanAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  disbursementDate: { seconds: number; nanoseconds: number; } | Date;
  emisPaid?: number;
}

export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
    
    // Redirect if not logged in
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    // Memoize Firestore references
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const loansColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'loans') : null, [user, firestore]);

    // Fetch user and loan data
    const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);
    const { data: loansData, isLoading: areLoansLoading } = useCollection<Loan>(loansColRef);

    const loans = useMemo(() => loansData || [], [loansData]);

    const isLoading = isUserLoading || isUserDocLoading || areLoansLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 md:p-8 flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        return null; // Will be redirected
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6">
                 {/* Financial Summary Cards */}
                <LoanSummaryCards loans={loans} />
                
                {/* Loans Overview Section */}
                <Card className="mt-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Your Loans</CardTitle>
                                <CardDescription>Manage and track your loan portfolio</CardDescription>
                            </div>
                            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddLoanOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Loan
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loans.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loans.map(loan => (
                                    <LoanCard key={loan.id} loan={loan} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <h3 className="text-lg font-semibold text-muted-foreground">No Loans Added Yet</h3>
                                <p className="text-sm text-muted-foreground mt-2">Click "Add Loan" to start tracking your debts.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
             <AddLoanDialog
                isOpen={isAddLoanOpen}
                setIsOpen={setIsAddLoanOpen}
                userId={user.uid}
            />
        </div>
    )
}
