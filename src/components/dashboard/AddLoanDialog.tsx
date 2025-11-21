
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, toDate } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { performExistingLoanCalculations } from '@/app/existing-loan/calculations';
import { useCurrency } from '@/contexts/currency-context';
import type { Loan } from '@/app/dashboard/page';

const transactionSchema = z.object({
  date: z.date({ required_error: 'Transaction date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['withdrawal', 'repayment']),
});

const disbursementSchema = z.object({
  date: z.date({ required_error: 'Disbursement date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

const loanFormSchema = z.object({
  loanName: z.string().min(1, 'Loan name is required.'),
  loanType: z.string({ required_error: 'Please select a loan type.' }),
  originalLoanAmount: z.coerce.number().positive('Must be a positive number.').optional(),
  disbursementDate: z.date({ required_error: 'Start date is required.' }),
  interestRate: z.coerce.number().min(0, 'Rate cannot be negative.').max(100, 'Rate seems too high.'),
  monthlyPayment: z.coerce.number().min(0, 'Cannot be negative.').optional(),
  emisPaid: z.coerce.number().min(0, 'Cannot be negative.').optional(),
  paymentDueDay: z.coerce.number().min(1).max(31).optional(),
  autoPay: z.boolean().optional(),
  
  // Education Loan fields
  interestType: z.enum(['reducing', 'flat']).optional(),
  moratoriumPeriod: z.coerce.number().min(0).optional(),
  moratoriumInterestType: z.enum(['none', 'simple', 'partial', 'fixed']).optional(),
  moratoriumPaymentAmount: z.coerce.number().optional(),
  missedEmis: z.coerce.number().min(0).optional(),
  disbursements: z.array(disbursementSchema).optional(),
  
  // Credit Card fields
  creditLimit: z.coerce.number().positive().optional(),
  minimumPaymentPercentage: z.coerce.number().min(0).max(100).optional(),
  annualFee: z.coerce.number().min(0).optional(),
  gracePeriod: z.coerce.number().min(0).optional(),
  
  // Credit Line fields
  transactions: z.array(transactionSchema).optional(),
  
  // Mortgage fields
  propertyValue: z.coerce.number().positive().optional(),
  downPayment: z.coerce.number().min(0).optional(),
  propertyTax: z.coerce.number().min(0).optional(),
  homeInsurance: z.coerce.number().min(0).optional(),
  pmi: z.coerce.number().min(0).optional(),
  
  // Car Loan fields
  vehicleValue: z.coerce.number().positive().optional(),
  tradeInValue: z.coerce.number().min(0).optional(),
  gapInsurance: z.coerce.number().min(0).optional(),
}).superRefine((data, ctx) => {
  // Credit Card validation
  if (data.loanType === 'credit-card') {
    if (!data.creditLimit || data.creditLimit <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Credit limit is required for credit cards.',
        path: ['creditLimit'],
      });
    }
    if (!data.originalLoanAmount || data.originalLoanAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current balance is required for credit cards.',
        path: ['originalLoanAmount'],
      });
    }
  }
  
  // Credit Line validation
  if (data.loanType === 'credit-line') {
    if (!data.transactions || data.transactions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one transaction is required for credit lines.',
        path: ['transactions'],
      });
    }
  }
  
  // Standard loans (personal, car, mortgage) validation
  if (['personal', 'car', 'mortgage'].includes(data.loanType)) {
    if (!data.originalLoanAmount || data.originalLoanAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Original loan amount is required.',
        path: ['originalLoanAmount'],
      });
    }
    if (!data.monthlyPayment || data.monthlyPayment <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Monthly payment is required.',
        path: ['monthlyPayment'],
      });
    }
  }
  
  // Education Loan validation
  if (data.loanType === 'education') {
    if ((!data.originalLoanAmount || data.originalLoanAmount <= 0) && (!data.disbursements || data.disbursements.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either Original Loan Amount or at least one Disbursement is required for Education Loans.',
        path: ['originalLoanAmount'],
      });
    }
    if ((data.moratoriumInterestType === 'partial' || data.moratoriumInterestType === 'fixed') 
        && (!data.moratoriumPaymentAmount || data.moratoriumPaymentAmount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Moratorium payment amount is required for this moratorium type.',
        path: ['moratoriumPaymentAmount'],
      });
    }
    // Monthly payment is optional for education loans (can be 0 during moratorium)
    // No validation needed - it's already optional and allows 0
  }
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
  { value: 'education', label: 'Education Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'credit-line', label: 'Credit Line' },
  { value: 'other', label: 'Other' }
];

export default function AddLoanDialog({ isOpen, setIsOpen, userId, loanToEdit }: AddLoanDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { currency } = useCurrency();

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
      autoPay: false,
      interestType: 'reducing',
      moratoriumPeriod: undefined,
      moratoriumInterestType: 'none',
      moratoriumPaymentAmount: undefined,
      missedEmis: undefined,
      disbursements: [],
      creditLimit: undefined,
      minimumPaymentPercentage: undefined,
      annualFee: undefined,
      gracePeriod: undefined,
      transactions: [],
      propertyValue: undefined,
      downPayment: undefined,
      propertyTax: undefined,
      homeInsurance: undefined,
      pmi: undefined,
      vehicleValue: undefined,
      tradeInValue: undefined,
      gapInsurance: undefined,
    },
  });

  const loanType = form.watch('loanType');
  const moratoriumPeriod = form.watch('moratoriumPeriod');
  const moratoriumInterestType = form.watch('moratoriumInterestType');

  const { fields: transactionFields, append: appendTransaction, remove: removeTransaction } = useFieldArray({
    control: form.control,
    name: 'transactions',
  });

  const { fields: disbursementFields, append: appendDisbursement, remove: removeDisbursement } = useFieldArray({
    control: form.control,
    name: 'disbursements',
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

      // Convert transactions if they exist
      const transactions = loanToEdit.transactions?.map(t => ({
        date: typeof t.date === 'object' && 'toDate' in t.date ? (t.date as any).toDate() : toDate(t.date),
        amount: t.amount,
        type: t.type,
      })) || [];

      form.reset({
        loanName: loanToEdit.loanName,
        loanType: loanToEdit.loanType,
        originalLoanAmount: loanToEdit.originalLoanAmount,
        disbursementDate: disbursementDate,
        interestRate: loanToEdit.interestRate,
        monthlyPayment: loanToEdit.monthlyPayment,
        emisPaid: loanToEdit.emisPaid,
        paymentDueDay: loanToEdit.paymentDueDay || 1,
        autoPay: loanToEdit.autoPay || false,
        interestType: (loanToEdit as any).interestType || 'reducing',
        moratoriumPeriod: loanToEdit.moratoriumPeriod,
        moratoriumInterestType: loanToEdit.moratoriumInterestType || 'none',
        moratoriumPaymentAmount: loanToEdit.moratoriumPaymentAmount,
        missedEmis: loanToEdit.missedEmis,
        disbursements: (loanToEdit.disbursements || []).map(d => ({
          date: typeof d.date === 'object' && 'toDate' in d.date ? (d.date as any).toDate() : toDate(d.date),
          amount: d.amount,
        })),
        creditLimit: loanToEdit.creditLimit,
        minimumPaymentPercentage: loanToEdit.minimumPaymentPercentage,
        annualFee: loanToEdit.annualFee,
        gracePeriod: loanToEdit.gracePeriod,
        transactions: transactions,
        propertyValue: loanToEdit.propertyValue,
        downPayment: loanToEdit.downPayment,
        propertyTax: loanToEdit.propertyTax,
        homeInsurance: loanToEdit.homeInsurance,
        pmi: loanToEdit.pmi,
        vehicleValue: loanToEdit.vehicleValue,
        tradeInValue: loanToEdit.tradeInValue,
        gapInsurance: loanToEdit.gapInsurance,
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
        autoPay: false,
        interestType: 'reducing',
        moratoriumPeriod: undefined,
        moratoriumInterestType: 'none',
        moratoriumPaymentAmount: undefined,
        missedEmis: undefined,
        disbursements: [],
        creditLimit: undefined,
        minimumPaymentPercentage: undefined,
        annualFee: undefined,
        gracePeriod: undefined,
        transactions: [],
        propertyValue: undefined,
        downPayment: undefined,
        propertyTax: undefined,
        homeInsurance: undefined,
        pmi: undefined,
        vehicleValue: undefined,
        tradeInValue: undefined,
        gapInsurance: undefined,
      });
    }
  }, [loanToEdit, isEditing, form]);

  // Reset loan-specific fields when loan type changes
  useEffect(() => {
    if (!isEditing) {
      form.resetField('interestType');
      form.resetField('moratoriumPeriod');
      form.resetField('moratoriumInterestType');
      form.resetField('moratoriumPaymentAmount');
      form.resetField('missedEmis');
      form.resetField('disbursements');
      form.resetField('creditLimit');
      form.resetField('minimumPaymentPercentage');
      form.resetField('annualFee');
      form.resetField('gracePeriod');
      form.resetField('transactions');
      form.resetField('propertyValue');
      form.resetField('downPayment');
      form.resetField('propertyTax');
      form.resetField('homeInsurance');
      form.resetField('pmi');
      form.resetField('vehicleValue');
      form.resetField('tradeInValue');
      form.resetField('gapInsurance');
    }
  }, [loanType, isEditing, form]);

  const renderLoanSpecificFields = () => {
    switch (loanType) {
      case 'education':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="interestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interest Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'reducing'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interest type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reducing">Reducing Balance</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>How interest is calculated on your loan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Label className="text-sm font-medium mb-2 block">Disbursements</Label>
              <FormDescription className="mb-3">If your loan was paid out in multiple parts, add each one here. The "Original Loan Amount" field will be ignored if you add any.</FormDescription>
              {disbursementFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg mb-4 relative">
                  <FormField
                    control={form.control}
                    name={`disbursements.${index}.date`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col flex-1">
                        <FormLabel>Disbursement Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`disbursements.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[120px]">
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 10000" className="w-full" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDisbursement(index)} className="mb-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => appendDisbursement({ date: new Date(), amount: 0 })} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Disbursement
              </Button>
            </div>
            <FormField
              control={form.control}
              name="moratoriumPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moratorium Period (months)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 6" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Period before repayment starts</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {moratoriumPeriod && moratoriumPeriod > 0 && (
              <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                <FormField
                  control={form.control}
                  name="moratoriumInterestType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label>Moratorium Interest Payment</Label>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value || 'none'} className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="none" /></FormControl>
                            <div className="space-y-1 leading-none">
                              <Label className="font-normal">No Payment</Label>
                              <p className="text-xs text-muted-foreground">Interest will be capitalized</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="simple" /></FormControl>
                            <div className="space-y-1 leading-none">
                              <Label className="font-normal">Pay Full Simple Interest</Label>
                              <p className="text-xs text-muted-foreground">Principal balance will not increase</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="partial" /></FormControl>
                            <div className="space-y-1 leading-none">
                              <Label className="font-normal">Pay Partial Amount</Label>
                              <p className="text-xs text-muted-foreground">Unpaid interest will be capitalized</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="fixed" /></FormControl>
                            <div className="space-y-1 leading-none">
                              <Label className="font-normal">Pay Fixed Minimum Amount</Label>
                              <p className="text-xs text-muted-foreground">Unpaid interest will be capitalized</p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(moratoriumInterestType === 'partial' || moratoriumInterestType === 'fixed') && (
                  <FormField
                    control={form.control}
                    name="moratoriumPaymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {moratoriumInterestType === 'partial' ? 'Partial Payment Amount' : 'Fixed Payment Amount'}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 2000" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            <FormField
              control={form.control}
              name="emisPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EMI Periods Passed (Post-Moratorium)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 12" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Total # of EMI payments made since moratorium ended</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="missedEmis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Missed EMIs</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 2" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      
      case 'credit-card':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="creditLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumPaymentPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Payment Percentage (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 2.5" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="annualFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Fee</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 99" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gracePeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grace Period (days)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 21" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      
      case 'credit-line':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Transactions</Label>
              <FormDescription className="mb-3">Add all withdrawals and repayments for your line of credit</FormDescription>
              {transactionFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg mb-4 relative">
                  <FormField
                    control={form.control}
                    name={`transactions.${index}.date`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col flex-1">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`transactions.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[120px]">
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 1000" className="w-full" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`transactions.${index}.type`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="withdrawal">Withdrawal</SelectItem>
                            <SelectItem value="repayment">Repayment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTransaction(index)} className="mb-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => appendTransaction({ date: new Date(), amount: 0, type: 'withdrawal' })} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          </div>
        );
      
      case 'mortgage':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="propertyValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="downPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Down Payment</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 100000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="propertyTax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Tax (Annual)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeInsurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Insurance (Annual)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1200" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pmi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PMI (Private Mortgage Insurance) - Annual</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1200" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      
      case 'car':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 30000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tradeInValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade-in Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gapInsurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GAP Insurance (Annual)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  // Helper function to remove undefined values from object (Firestore doesn't accept undefined)
  const removeUndefined = (obj: any): any => {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        if (Array.isArray(obj[key])) {
          // For arrays, filter out undefined items and clean nested objects
          cleaned[key] = obj[key]
            .filter((item: any) => item !== undefined)
            .map((item: any) => {
              if (typeof item === 'object' && item !== null && !(item instanceof Date)) {
                return removeUndefined(item);
              }
              return item;
            });
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date)) {
          // Recursively clean nested objects
          cleaned[key] = removeUndefined(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  };

  const onSubmit = async (data: LoanFormValues) => {
    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error("User not authenticated.");
      }

      // Prepare data for calculation
      const calculationInput: any = {
        loanType: data.loanType,
        loanName: data.loanName,
        interestType: 'reducing',
        rateType: 'fixed',
        originalLoanAmount: data.originalLoanAmount || 0,
        disbursementDate: data.disbursementDate,
        interestRate: data.interestRate,
        emiAmount: data.monthlyPayment ?? 0,
        emisPaid: data.emisPaid || 0,
        paymentDueDay: data.paymentDueDay || 1,
      };

      // Add education loan specific fields
      if (data.loanType === 'education') {
        calculationInput.interestType = data.interestType || 'reducing';
        calculationInput.moratoriumPeriod = data.moratoriumPeriod || 0;
        calculationInput.moratoriumInterestType = data.moratoriumInterestType || 'none';
        calculationInput.moratoriumPaymentAmount = data.moratoriumPaymentAmount;
        calculationInput.missedEmis = data.missedEmis || 0;
        if (data.disbursements && data.disbursements.length > 0) {
          calculationInput.disbursements = data.disbursements.map(d => ({
            date: d.date,
            amount: d.amount,
          }));
        }
      }

      // Add credit line transactions
      if (data.loanType === 'credit-line' && data.transactions) {
        calculationInput.transactions = data.transactions.map(t => ({
          date: t.date,
          amount: t.amount,
          type: t.type,
        }));
      }

      let outstandingBalance = data.originalLoanAmount || 0;
      
      // Only calculate if it's not a credit line (credit lines use transactions)
      if (data.loanType !== 'credit-line') {
        try {
          const calculatedData = performExistingLoanCalculations(calculationInput);
          outstandingBalance = calculatedData.outstandingBalance;
        } catch (error) {
          console.error("Calculation error:", error);
          // For credit cards, use original amount as current balance if calculation fails
          if (data.loanType === 'credit-card') {
            outstandingBalance = data.originalLoanAmount || 0;
          }
        }
      } else {
        // For credit lines, calculate balance from transactions
        if (data.transactions && data.transactions.length > 0) {
          outstandingBalance = data.transactions.reduce((balance, t) => {
            return t.type === 'withdrawal' ? balance + t.amount : balance - t.amount;
          }, 0);
        }
      }
      
      const loanData: any = {
          userId: userId, // Required by Firestore security rules
          loanName: data.loanName,
          loanType: data.loanType,
          originalLoanAmount: data.originalLoanAmount || 0,
          currentBalance: outstandingBalance,
          interestRate: data.interestRate,
          monthlyPayment: data.monthlyPayment || 0,
          disbursementDate: data.disbursementDate,
          emisPaid: data.emisPaid,
          paymentDueDay: data.paymentDueDay || 1,
          autoPay: data.autoPay || false,
          currency: currency,
          // Education loan fields
          interestType: data.interestType,
          moratoriumPeriod: data.moratoriumPeriod,
          moratoriumInterestType: data.moratoriumInterestType,
          moratoriumPaymentAmount: data.moratoriumPaymentAmount,
          missedEmis: data.missedEmis,
          disbursements: data.disbursements?.map(d => ({
            date: d.date,
            amount: d.amount,
          })),
          // Credit card fields
          creditLimit: data.creditLimit,
          minimumPaymentPercentage: data.minimumPaymentPercentage,
          annualFee: data.annualFee,
          gracePeriod: data.gracePeriod,
          // Credit line fields
          transactions: data.transactions,
          // Mortgage fields
          propertyValue: data.propertyValue,
          downPayment: data.downPayment,
          propertyTax: data.propertyTax,
          homeInsurance: data.homeInsurance,
          pmi: data.pmi,
          // Car loan fields
          vehicleValue: data.vehicleValue,
          tradeInValue: data.tradeInValue,
          gapInsurance: data.gapInsurance,
      }

      // Remove undefined values before saving to Firestore
      const cleanedLoanData = removeUndefined(loanData);

      if (isEditing && loanToEdit) {
        // Update existing loan
        const loanDocRef = doc(firestore, 'users', userId, 'loans', loanToEdit.id);
        await updateDoc(loanDocRef, cleanedLoanData);
        toast({
            title: 'Success!',
            description: `Loan "${data.loanName}" has been updated.`,
        });
      } else {
        // Add new loan
        const loansCollectionRef = collection(firestore, 'users', userId, 'loans');
        await addDoc(loansCollectionRef, {
            ...cleanedLoanData,
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
      <DialogContent className="sm:max-w-[700px]">
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
                  <FormLabel>
                    {loanType === 'credit-card' ? 'Current Balance' : 'Original Loan Amount'}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 25000" {...field} value={field.value ?? ''} />
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
                {loanType !== 'credit-line' && (
                  <FormField
                      control={form.control}
                      name="monthlyPayment"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>
                            {loanType === 'credit-card' ? 'Typical Monthly Payment' : 'Monthly EMI'}
                          </FormLabel>
                          <FormControl>
                              <Input type="number" placeholder="e.g., 450" {...field} value={field.value ?? ''} />
                          </FormControl>
                          {loanType === 'education' && (
                            <FormDescription>Optional during moratorium period. Enter 0 if you're only paying interest.</FormDescription>
                          )}
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                )}
            </div>
             {(loanType !== 'credit-card' && loanType !== 'credit-line') && (
               <FormField
                  control={form.control}
                  name="emisPaid"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Number of EMIs Already Paid</FormLabel>
                      <FormControl>
                          <Input type="number" placeholder="e.g., 12" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
             )}
              {loanType !== 'credit-line' && (
                <FormField
                  control={form.control}
                  name="paymentDueDay"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Payment Due Day of Month</FormLabel>
                      <FormControl>
                          <Input type="number" placeholder="e.g., 1" min="1" max="31" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                />
              )}
              
              {/* Loan Type Specific Fields */}
              {loanType && renderLoanSpecificFields()}
              <FormField
                control={form.control}
                name="autoPay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Deduct Payment</FormLabel>
                      <FormDescription>
                        Automatically log payments when the due date arrives
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
