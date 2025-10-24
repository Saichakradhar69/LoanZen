
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { performExistingLoanCalculations } from '@/app/existing-loan/calculations';
import type { Loan } from '@/app/dashboard/page';

const paymentFormSchema = z.object({
  loanId: z.string({ required_error: 'Please select a loan.' }),
  paymentAmount: z.coerce.number().positive('Payment amount must be positive.'),
  paymentDate: z.date({ required_error: 'Payment date is required.' }),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface RecordPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userId: string;
  loans: Loan[];
}

export default function RecordPaymentDialog({ isOpen, setIsOpen, userId, loans }: RecordPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      loanId: '',
      paymentAmount: '' as any,
      paymentDate: new Date(),
    },
  });

  useEffect(() => {
    // If there's only one loan, pre-select it
    if (loans.length === 1) {
      form.setValue('loanId', loans[0].id);
    }
  }, [loans, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error("User not authenticated.");
      }

      const selectedLoan = loans.find(loan => loan.id === data.loanId);
      if (!selectedLoan) {
        throw new Error("Selected loan not found.");
      }

      // 1. Save the new payment
      const paymentsCollectionRef = collection(firestore, 'users', userId, 'loans', data.loanId, 'payments');
      await addDoc(paymentsCollectionRef, {
        paymentAmount: data.paymentAmount,
        paymentDate: data.paymentDate,
        createdAt: serverTimestamp(),
      });

      // 2. Fetch all payments for the loan to recalculate balance
      const allPaymentsSnapshot = await getDocs(paymentsCollectionRef);
      const allPayments = allPaymentsSnapshot.docs.map(doc => ({
        date: (doc.data().paymentDate as any).toDate(),
        amount: doc.data().paymentAmount,
        type: 'repayment', // Assuming all recorded payments are repayments
      }));
      // Add the new payment to the list for immediate recalculation
      allPayments.push({
          date: data.paymentDate,
          amount: data.paymentAmount,
          type: 'repayment',
      });

      // 3. Recalculate current balance
      const calculationInput = {
        ...selectedLoan,
        disbursementDate: (selectedLoan.disbursementDate as any).toDate ? (selectedLoan.disbursementDate as any).toDate() : selectedLoan.disbursementDate,
        interestType: 'reducing', // Assuming reducing balance, adjust if necessary
        rateType: 'fixed', // Assuming fixed rate, adjust if necessary
        emiAmount: selectedLoan.monthlyPayment,
        transactions: allPayments,
      };

      const { outstandingBalance } = performExistingLoanCalculations(calculationInput as any);

      // 4. Update the loan's currentBalance
      const loanDocRef = doc(firestore, 'users', userId, 'loans', data.loanId);
      await updateDoc(loanDocRef, {
        currentBalance: outstandingBalance,
      });

      toast({
        title: 'Success!',
        description: `Payment of ${format(data.paymentDate, 'PPP')} for ${data.paymentAmount} has been recorded.`,
      });
      
      form.reset();
      setIsOpen(false);
    } catch (error) {
        console.error("Failed to record payment:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not record the payment. Please try again."
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record a Payment</DialogTitle>
          <DialogDescription>
            Select a loan and enter the payment details. The loan balance will be updated automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="loanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a loan to pay" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loans.map(loan => (
                        <SelectItem key={loan.id} value={loan.id}>{loan.loanName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
