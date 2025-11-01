
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
import { format, toDate } from 'date-fns';
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
      const selectedLoan = loans.find(l => l.id === loans[0].id);
      if (selectedLoan) {
          form.setValue('paymentAmount', selectedLoan.monthlyPayment);
      }
    } else {
      // Reset when dialog is opened or loans change
      form.reset({
        loanId: '',
        paymentAmount: '' as any,
        paymentDate: new Date(),
      });
    }
  }, [isOpen, loans, form]);

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

      // Helper to safely convert Firestore Timestamp or Date to Date object
      const toDateObject = (dateValue: any): Date => {
        if (!dateValue) throw new Error("Date is required");
        if (dateValue instanceof Date) return dateValue;
        if (dateValue && typeof dateValue.toDate === 'function') {
          return dateValue.toDate();
        }
        if (dateValue && typeof dateValue.seconds === 'number') {
          return new Date(dateValue.seconds * 1000);
        }
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          throw new Error(`Invalid date format: ${dateValue}`);
        }
        return parsed;
      };

      const disbursementDateObj = toDateObject(selectedLoan.disbursementDate);

      // 1. Save the new payment to its subcollection
      // Ensure paymentDate is a proper Date object for Firestore
      const paymentDateObj = data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate);
      
      const paymentsCollectionRef = collection(firestore, 'users', userId, 'loans', data.loanId, 'payments');
      await addDoc(paymentsCollectionRef, {
        paymentAmount: data.paymentAmount,
        paymentDate: paymentDateObj,
        createdAt: serverTimestamp(),
      });
      
      // Determine whether this counts as a full EMI or a partial/extra payment
      const isFullEmiPayment = data.paymentAmount >= (selectedLoan.monthlyPayment - 0.01);
      const newEmisPaidCount = (selectedLoan.emisPaid || 0) + (isFullEmiPayment ? 1 : 0);

      // 2. Recalculate current balance using the full loan and payment history
      const calculationInput = {
        ...selectedLoan,
        disbursementDate: disbursementDateObj,
        interestType: 'reducing',
        rateType: 'fixed',
        emiAmount: selectedLoan.monthlyPayment,
        emisPaid: newEmisPaidCount,
        disbursements: [{ date: disbursementDateObj, amount: selectedLoan.originalLoanAmount }]
      };
      
      // performExistingLoanCalculations now handles all transactions internally
      let outstandingBalance: number;
      try {
        const result = performExistingLoanCalculations(calculationInput as any);
        outstandingBalance = result.outstandingBalance;
      } catch (calcError) {
        console.error("Calculation error:", calcError);
        // Fallback: simple manual calculation
        const monthlyInterest = selectedLoan.currentBalance * (selectedLoan.interestRate / 100 / 12);
        const principalPaid = Math.max(0, data.paymentAmount - monthlyInterest);
        outstandingBalance = Math.max(0, selectedLoan.currentBalance - principalPaid);
      }

      // Apply any extra or partial amount as a direct principal adjustment
      // - If full EMI: extraAmount reduces principal immediately
      // - If partial (less than EMI): treat the whole amount as a principal-only payment today
      const extraAmount = isFullEmiPayment ? (data.paymentAmount - selectedLoan.monthlyPayment) : data.paymentAmount;
      if (extraAmount && extraAmount > 0) {
        outstandingBalance = Math.max(0, outstandingBalance - extraAmount);
      }

      // 3. Update the loan's currentBalance and emisPaid
      const loanDocRef = doc(firestore, 'users', userId, 'loans', data.loanId);
      await updateDoc(loanDocRef, {
        currentBalance: outstandingBalance,
        emisPaid: newEmisPaidCount,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Success!',
        description: `Payment of ${formatCurrency(data.paymentAmount)} on ${format(data.paymentDate, 'PPP')} has been recorded.`,
      });
      
      form.reset();
      setIsOpen(false);
    } catch (error) {
        console.error("Failed to record payment:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: `Could not record the payment. ${error instanceof Error ? error.message : ''}`
        });
    } finally {
        setIsLoading(false);
    }
  };
  
    const handleLoanChange = (loanId: string) => {
        const selectedLoan = loans.find(loan => loan.id === loanId);
        if (selectedLoan) {
            form.setValue('paymentAmount', selectedLoan.monthlyPayment);
        }
    }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

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
                  <Select onValueChange={(value) => {field.onChange(value); handleLoanChange(value);}} defaultValue={field.value} value={field.value}>
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
                    <Input type="number" step="0.01" placeholder="e.g., 500" {...field} />
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
