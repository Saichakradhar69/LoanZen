
'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import AddLoanDialog from "@/components/dashboard/AddLoanDialog";
import LoanSummaryCards from "@/components/dashboard/LoanSummaryCards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import QuickActions from '@/components/dashboard/QuickActions';
import UpcomingPayments from '@/components/dashboard/UpcomingPayments';
import AiInsights from '@/components/dashboard/AiInsights';
import YourLoans from '@/components/dashboard/YourLoans';
import PaymentTimeline from '@/components/dashboard/PaymentTimeline';
import RecordPaymentDialog from '@/components/dashboard/RecordPaymentDialog';

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
  paymentDueDay?: number;
}

export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
    const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
    const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
    const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
    
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const loansColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'loans') : null, [user, firestore]);

    const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);
    const { data: loansData, isLoading: areLoansLoading } = useCollection<Loan>(loansColRef);

    const loans = useMemo(() => loansData || [], [loansData]);
    const isLoading = isUserLoading || isUserDocLoading || areLoansLoading;

    const handleEdit = (loan: Loan) => {
        setLoanToEdit(loan);
        setIsAddLoanOpen(true);
    };

    const handleDelete = async () => {
        if (!loanToDelete || !user) return;
        
        try {
            const loanDocRef = doc(firestore, 'users', user.uid, 'loans', loanToDelete.id);
            await deleteDoc(loanDocRef);
            toast({
                title: "Success",
                description: `Loan "${loanToDelete.loanName}" has been deleted.`,
            });
        } catch (error) {
            console.error("Error deleting loan: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not delete the loan. Please try again.",
            });
        } finally {
            setLoanToDelete(null);
        }
    };
    
    const handleAddLoanDialogClose = (open: boolean) => {
        if (!open) {
            setLoanToEdit(null);
        }
        setIsAddLoanOpen(open);
    }
    
     const handleRecordPaymentDialogClose = () => {
        setIsRecordPaymentOpen(false);
    }

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 md:p-8 flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        return null; 
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
                <LoanSummaryCards loans={loans} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                         <YourLoans 
                            loans={loans} 
                            onAddLoan={() => setIsAddLoanOpen(true)}
                            onEdit={handleEdit}
                            onDelete={setLoanToDelete}
                         />
                         <PaymentTimeline loans={loans} />
                    </div>
                    <div className="space-y-8">
                        <QuickActions 
                            onAddLoan={() => setIsAddLoanOpen(true)}
                            onRecordPayment={() => setIsRecordPaymentOpen(true)}
                         />
                        <UpcomingPayments loans={loans} />
                        <AiInsights />
                    </div>
                </div>
            </div>
             <AddLoanDialog
                isOpen={isAddLoanOpen}
                setIsOpen={handleAddLoanDialogClose}
                userId={user.uid}
                loanToEdit={loanToEdit}
            />
            <RecordPaymentDialog
                isOpen={isRecordPaymentOpen}
                setIsOpen={handleRecordPaymentDialogClose}
                userId={user.uid}
                loans={loans}
            />
            <AlertDialog open={!!loanToDelete} onOpenChange={() => setLoanToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your loan
                        named <span className="font-bold">"{loanToDelete?.loanName}"</span> and remove its data from our servers.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
