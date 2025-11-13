
'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { checkUserAccess, type UserDoc } from '@/lib/user-access';
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
  currency?: 'USD' | 'EUR' | 'GBP' | 'INR';
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
    const [isWaitingForSubscription, setIsWaitingForSubscription] = useState(false);
    
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const loansColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'loans') : null, [user, firestore]);

    const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);
    const { data: loansData, isLoading: areLoansLoading } = useCollection<Loan>(loansColRef);

    // Handle subscription success - automatically update subscription
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        
        if (sessionId && user && !isWaitingForSubscription) {
            console.log('🔵 Payment successful, automatically updating subscription...');
            setIsWaitingForSubscription(true);
            
            // Clean up URL immediately
            router.replace('/dashboard');
            
            // Show success toast
            toast({
                title: 'Payment Successful!',
                description: 'Your subscription is being activated automatically...',
            });
            
            let pollInterval: NodeJS.Timeout | null = null;
            
            // Polling function as fallback
            const startPolling = () => {
                let attempts = 0;
                const maxAttempts = 15; // 15 seconds max wait
                
                pollInterval = setInterval(() => {
                    attempts++;
                    
                    // Check if userData has been updated with subscription
                    if (userData) {
                        const access = checkUserAccess(userData as UserDoc);
                        if (access === 'subscribed') {
                            if (pollInterval) clearInterval(pollInterval);
                            setIsWaitingForSubscription(false);
                            toast({
                                title: 'Subscription Activated!',
                                description: 'Welcome to LoanZen Pro! Your subscription is now active.',
                            });
                            return;
                        }
                    }
                    
                    // If max attempts reached, stop polling
                    if (attempts >= maxAttempts) {
                        if (pollInterval) clearInterval(pollInterval);
                        setIsWaitingForSubscription(false);
                        toast({
                            title: 'Subscription Processing',
                            description: 'Your payment was successful. Please refresh the page in a moment.',
                            variant: 'default',
                        });
                    }
                }, 1000); // Check every second
            };
            
            // Automatically trigger update immediately
            const triggerUpdate = async () => {
                try {
                    console.log('🔄 Automatically updating subscription...');
                    const response = await fetch('/api/subscription/manual-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.uid,
                            sessionId: sessionId,
                        }),
                    });
                    
                    const data = await response.json();
                    console.log('📥 Auto-update response:', data);
                    
                    if (response.ok && data.success) {
                        console.log('✅ Automatic update successful');
                        toast({
                            title: 'Subscription Activated!',
                            description: 'Welcome to LoanZen Pro! Your subscription is now active.',
                        });
                        setIsWaitingForSubscription(false);
                        // Force page refresh to reload userData
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        console.error('❌ Automatic update failed:', data.error);
                        // Fall back to polling
                        startPolling();
                    }
                } catch (error) {
                    console.error('❌ Automatic update request failed:', error);
                    // Fall back to polling
                    startPolling();
                }
            };
            
            // Trigger update immediately
            triggerUpdate();
            
            // Cleanup on unmount
            return () => {
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
            };
        }
    }, [user, router, toast, userData, isWaitingForSubscription]);

    // Check user access and redirect to subscribe page if expired
    // Skip this check if we're waiting for subscription to be activated
    useEffect(() => {
        if (!isUserDocLoading && userData && !isWaitingForSubscription) {
            const access = checkUserAccess(userData as UserDoc);
            
            // If user has access (trial or subscribed), allow access
            if (access === 'trial' || access === 'subscribed') {
                return;
            }
            
            // If expired or no access, redirect to subscribe
            if (access === 'expired' || !access) {
                router.push('/subscribe');
            }
        }
    }, [userData, isUserDocLoading, router, isWaitingForSubscription]);

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

    if (isLoading || isWaitingForSubscription) {
        return (
            <div className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center min-h-[60vh] gap-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                {isWaitingForSubscription && (
                    <div className="text-center space-y-2 max-w-md">
                        <p className="text-lg font-semibold">Activating Your Subscription</p>
                        <p className="text-sm text-muted-foreground">
                            Your payment was successful. We're activating your subscription automatically...
                        </p>
                    </div>
                )}
            </div>
        );
    }
    
    if (!user) {
        return null; 
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
            <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
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
