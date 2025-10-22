
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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


const loanFormSchema = z.object({
  loanName: z.string().min(1, 'Loan name is required.'),
  loanType: z.string({ required_error: 'Please select a loan type.' }),
  originalLoanAmount: z.coerce.number().positive('Must be a positive number.'),
  disbursementDate: z.date({ required_error: 'Start date is required.' }),
  interestRate: z.coerce.number().min(0, 'Rate cannot be negative.').max(100, 'Rate seems too high.'),
  monthlyPayment: z.coerce.number().positive('Must be a positive number.'),
  emisPaid: z.coerce.number().min(0, 'Cannot be negative.'),
  paymentDueDay: z.coerce.number().min(1).max(31).optional(),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

interface AddLoanDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userId: string;
  loanToEdit?: Loan | null;
}

const loanTypes = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'other', label: 'Other' }
];

export default function AddLoanDialog({ isOpen, setIsOpen, userId, loanToEdit }: AddLoanDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isEditing = !!loanToEdit;

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      loanName: '',
      loanType: '',
      originalLoanAmount: '' as any,
      disbursementDate: undefined,
      interestRate: '' as any,
      monthlyPayment: '' as any,
      emisPaid: '' as any,
      paymentDueDay: 1,
    },
  });

  useEffect(() => {
    if (isEditing && loanToEdit) {
      let disbursementDate: Date;
      // Convert Firestore Timestamp to Date if necessary
      if (loanToEdit.disbursementDate && typeof (loanToEdit.disbursementDate as any).toDate === 'function') {
        disbursementDate = (loanToEdit.disbursementDate as any).toDate();
      } else {
        disbursementDate = toDate(loanToEdit.disbursementDate);
      }

      form.reset({
        loanName: loanToEdit.loanName,
        loanType: loanToEdit.loanType,
        originalLoanAmount: loanToEdit.originalLoanAmount,
        disbursementDate: disbursementDate,
        interestRate: loanToEdit.interestRate,
        monthlyPayment: loanToEdit.monthlyPayment,
        emisPaid: loanToEdit.emisPaid,
        paymentDueDay: loanToEdit.paymentDueDay || 1,
      });
    } else {
      form.reset({
        loanName: '',
        loanType: 'personal',
        originalLoanAmount: '' as any,
        disbursementDate: new Date(),
        interestRate: '' as any,
        monthlyPayment: '' as any,
        emisPaid: 0,
        paymentDueDay: 1,
      });
    }
  }, [loanToEdit, isEditing, form]);


  const onSubmit = async (data: LoanFormValues) => {
    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error("User not authenticated.");
      }

      // Prepare data for calculation
      const calculationInput = {
        loanType: data.loanType,
        loanName: data.loanName,
        interestType: 'reducing',
        rateType: 'fixed',
        originalLoanAmount: data.originalLoanAmount,
        disbursementDate: data.disbursementDate,
        interestRate: data.interestRate,
        emiAmount: data.monthlyPayment,
        emisPaid: data.emisPaid,
        paymentDueDay: data.paymentDueDay || 1,
      };

      const calculatedData = performExistingLoanCalculations(calculationInput as any);
      const { outstandingBalance } = calculatedData;
      
      const loanData = {
          ...data,
          userId,
          currentBalance: outstandingBalance
      }

      if (isEditing && loanToEdit) {
        // Update existing loan
        const loanDocRef = doc(firestore, 'users', userId, 'loans', loanToEdit.id);
        await updateDoc(loanDocRef, loanData);
        toast({
            title: 'Success!',
            description: `Loan "${data.loanName}" has been updated.`,
        });
      } else {
        // Add new loan
        const loansCollectionRef = collection(firestore, 'users', userId, 'loans');
        await addDoc(loansCollectionRef, {
            ...loanData,
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Success!',
            description: `Loan "${data.loanName}" has been added.`,
        });
      }
      
      form.reset();
      setIsOpen(false);
    } catch (error) {
        console.error("Failed to save loan:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save the loan. Please try again."
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Loan' : 'Add a New Loan'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details of your loan.' : 'Enter the details of your loan to start tracking it.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="loanName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Toyota Car Loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="loanType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a loan type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loanTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="originalLoanAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Loan Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 25000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="disbursementDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Loan Start Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
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
                            disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 5.5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="monthlyPayment"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Monthly EMI</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 450" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="emisPaid"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Number of EMIs Already Paid</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 12" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
              <FormField
                control={form.control}
                name="paymentDueDay"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Payment Due Day of Month</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 1" min="1" max="31" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Loan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
