

'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Info, Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';


const disbursementSchema = z.object({
  date: z.date({ required_error: 'Disbursement date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

const rateChangeSchema = z.object({
  date: z.date({ required_error: 'Effective date is required.' }),
  rate: z.coerce.number().positive('Rate must be positive.').max(100, "Rate seems too high."),
});

const transactionSchema = z.object({
  date: z.date({ required_error: 'Transaction date is required.' }),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['repayment', 'disbursement']),
});

// This is the client-side validation schema.
const formSchema = z.object({
    loanType: z.string({ required_error: 'Please select a loan type.' }),
    loanName: z.string().optional(),
    originalLoanAmount: z.coerce.number().optional(),
    disbursementDate: z.date({ required_error: 'Disbursement date is required.' }),
    interestRate: z.coerce.number().positive('Interest rate must be positive.').max(100, "Rate seems too high."),
    interestType: z.enum(['reducing', 'flat']),
    rateType: z.enum(['fixed', 'floating']),
    emiAmount: z.coerce.number().optional(),
    paymentDueDay: z.coerce.number().min(1).max(31).optional(),
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional(),
    moratoriumInterestType: z.enum(['none', 'simple', 'partial', 'fixed']).optional(),
    moratoriumPaymentAmount: z.coerce.number().optional(),
    disbursements: z.array(disbursementSchema).optional(),
    rateChanges: z.array(rateChangeSchema).optional(),
    transactions: z.array(transactionSchema).optional(), // for credit-line and custom
    emisPaid: z.coerce.number().min(0, "EMI periods passed cannot be negative.").optional(),
    missedEmis: z.coerce.number().min(0, "Missed EMIs cannot be negative.").optional(),
}).superRefine((data, ctx) => {
    // For standard loans, require original amount OR disbursements, plus EMI details.
    if (['personal', 'car', 'home'].includes(data.loanType)) {
        if ((!data.originalLoanAmount || data.originalLoanAmount <= 0) && (!data.disbursements || data.disbursements.length === 0)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Either Original Loan Amount or at least one Disbursement is required.",
                path: ["originalLoanAmount"],
            });
        }
        if (!data.emiAmount || data.emiAmount <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Monthly Payment (EMI) Amount is required for this loan type.",
                path: ["emiAmount"],
            });
        }
        if (data.emisPaid === undefined || data.emisPaid < 0) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Number of EMIs Already Paid is required for this loan type.",
                path: ["emisPaid"],
            });
        }
    }

    // For education loans, require original amount OR disbursements.
    if (data.loanType === 'education' && (!data.originalLoanAmount || data.originalLoanAmount <= 0) && (!data.disbursements || data.disbursements.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Original Loan Amount or at least one Disbursement is required for Education Loans.",
            path: ["originalLoanAmount"],
        });
    }
    
    if (data.loanType === 'education' && (data.moratoriumInterestType === 'partial' || data.moratoriumInterestType === 'fixed') && (!data.moratoriumPaymentAmount || data.moratoriumPaymentAmount <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A payment amount is required for this moratorium type.",
            path: ["moratoriumPaymentAmount"],
        });
    }

    if (data.missedEmis && data.emisPaid !== undefined && data.missedEmis > data.emisPaid) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Missed EMIs cannot be greater than total EMIs paid.",
            path: ["missedEmis"],
        });
    }
});

export type ExistingLoanFormData = z.infer<typeof formSchema>;

interface ExistingLoanFormProps {
    onCalculate: (data: ExistingLoanFormData) => void;
    serverState: any;
}


export default function ExistingLoanForm({ onCalculate, serverState }: ExistingLoanFormProps) {
    const form = useForm<ExistingLoanFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            loanType: 'personal',
            interestType: 'reducing',
            rateType: 'fixed',
            originalLoanAmount: undefined,
            disbursementDate: undefined,
            interestRate: undefined,
            emiAmount: undefined,
            paymentDueDay: 1,
            moratoriumPeriod: 0,
            moratoriumInterestType: 'none',
            moratoriumPaymentAmount: undefined,
            emisPaid: undefined,
            missedEmis: 0,
            disbursements: [],
            rateChanges: [],
            transactions: [],
        },
    });
    
    // This effect will sync server-side errors with the form's state
    useEffect(() => {
        if (serverState?.type === 'error' && serverState.errors) {
            const fieldErrors = serverState.errors;
            for (const fieldName in fieldErrors) {
                if (Object.prototype.hasOwnProperty.call(fieldErrors, fieldName)) {
                    form.setError(fieldName as any, {
                        type: 'server',
                        message: Array.isArray(fieldErrors[fieldName]) ? fieldErrors[fieldName][0] : fieldErrors[fieldName]
                    });
                }
            }
        }
    }, [serverState, form]);

    const loanType = form.watch('loanType');
    const rateType = form.watch('rateType');
    const disbursements = form.watch('disbursements');
    const moratoriumPeriod = form.watch('moratoriumPeriod');
    const moratoriumInterestType = form.watch('moratoriumInterestType');
    
    const { fields: disbursementFields, append: appendDisbursement, remove: removeDisbursement } = useFieldArray({ control: form.control, name: 'disbursements' });
    const { fields: rateChangeFields, append: appendRateChange, remove: removeRateChange } = useFieldArray({ control: form.control, name: 'rateChanges' });
     const { fields: transactionFields, append: appendTransaction, remove: removeTransaction } = useFieldArray({ control: form.control, name: 'transactions' });

    const isOriginalAmountDisabled = disbursements && disbursements.length > 0;

    const renderCommonFields = () => (
        <>
            {!isOriginalAmountDisabled ? (
                <FormField control={form.control} name="originalLoanAmount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Original Loan Amount</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} disabled={isOriginalAmountDisabled} /></FormControl>
                        {isOriginalAmountDisabled && <FormDescription>This is disabled because you have added specific disbursements.</FormDescription>}
                        <FormMessage />
                    </FormItem>
                )} />
            ) : null}
             <FormField control={form.control} name="disbursementDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>First Disbursement/Usage Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="interestRate" render={({ field }) => (
                <FormItem>
                    <FormLabel>Current/Initial Interest Rate (%)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 8.5" {...field} value={field.value ?? ''} /></FormControl>
                     <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="interestType" render={({ field }) => (
                <FormItem className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FormLabel>Interest Calculation</FormLabel>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-bold">Reducing Balance:</p>
                                    <p className="mb-2">Interest is calculated on the remaining loan balance. Your interest payment decreases over time. (Most common)</p>
                                    <p className="font-bold">Flat:</p>
                                    <p>Interest is calculated on the original loan amount for the entire term. Your interest payment remains constant.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="reducing" /></FormControl>
                                <Label className="font-normal">Reducing Balance</Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="flat" /></FormControl>
                                <Label className="font-normal">Flat</Label>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="rateType" render={({ field }) => (
                <FormItem className="space-y-3">
                     <FormLabel>Interest Rate Type</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="fixed" /></FormControl>
                                <Label className="font-normal">Fixed</Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value="floating" /></FormControl>
                                <Label className="font-normal">Floating</Label>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
             {loanType !== 'credit-line' && (
                <>
                <FormField control={form.control} name="emiAmount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Monthly Payment (EMI) Amount</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 1200" {...field} value={field.value ?? ''} /></FormControl>
                        <FormDescription>The amount you pay each month.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="paymentDueDay" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Payment Due Day of Month</FormLabel>
                        <FormControl><Input type="number" min="1" max="31" placeholder="e.g., 5" {...field} value={field.value ?? ''} /></FormControl>
                        <FormDescription>The day your EMI is due each month.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                </>
             )}
        </>
    )
    
    const renderFloatingRateHistory = () => (
        <div>
            <Label>Floating Rate History</Label>
            <FormDescription>If your interest rate has changed over time, add each change here.</FormDescription>
            <div className="space-y-4 mt-2">
            {rateChangeFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                    <FormField control={form.control} name={`rateChanges.${index}.date`} render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Effective Date</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`rateChanges.${index}.rate`} render={({ field }) => (
                            <FormItem><FormLabel>New Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 9.2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeRateChange(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => appendRateChange({ date: new Date(), rate: '' as any })}><Plus className="mr-2" />Add Rate Change</Button>
        </div>
    </div>
    )

    const renderDisbursements = () => (
         <div>
             <Label>Disbursements</Label>
             <FormDescription>If your loan was paid out in multiple parts, add each one here. The "Original Loan Amount" field will be ignored if you add any.</FormDescription>
             <div className="space-y-4 mt-2">
                {disbursementFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                        <FormField control={form.control} name={`disbursements.${index}.date`} render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Disbursement Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`disbursements.${index}.amount`} render={({ field }) => (
                             <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeDisbursement(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendDisbursement({ date: new Date(), amount: '' as any })}><Plus className="mr-2" />Add Disbursement</Button>
            </div>
        </div>
    )
    
     const renderTransactions = () => (
         <div>
             <Label>Transactions</Label>
             <FormDescription>Add all withdrawals and repayments for your line of credit.</FormDescription>
             <div className="space-y-4 mt-2">
                {transactionFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                        <FormField control={form.control} name={`transactions.${index}.date`} render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`transactions.${index}.amount`} render={({ field }) => (
                             <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`transactions.${index}.type`} render={({ field }) => (
                            <FormItem className="w-full"><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="disbursement">Withdrawal</SelectItem><SelectItem value="repayment">Repayment</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeTransaction(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendTransaction({ date: new Date(), amount: '' as any, type: 'disbursement' })}><Plus className="mr-2" />Add Transaction</Button>
            </div>
        </div>
    )


    const renderLoanSpecificFields = () => {
        switch (loanType) {
            case 'education':
                return (
                    <div className="space-y-6">
                        <FormField control={form.control} name="emisPaid" render={({ field }) => (
                            <FormItem>
                                <FormLabel>EMI Periods Passed (Post-Moratorium)</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 12" {...field} value={field.value ?? ''} /></FormControl>
                                <FormDescription>Total # of EMI payments made since the moratorium ended.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="missedEmis" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Missed EMIs</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 2" {...field} value={field.value ?? ''} /></FormControl>
                                <FormDescription>Of the total EMIs passed, how many were missed?</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="moratoriumPeriod" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Moratorium Period (in months)</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 6" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        {moratoriumPeriod && moratoriumPeriod > 0 && (
                            <div className="space-y-4 rounded-md border bg-gray-50 dark:bg-gray-900 p-4">
                                <FormField control={form.control} name="moratoriumInterestType" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <Label>Moratorium Interest Payment</Label>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value || 'none'} className="flex flex-col space-y-2">
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="none" /></FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <Label className="font-normal">No Payment</Label>
                                                        <p className="text-xs text-muted-foreground">Interest will be capitalized (added to principal).</p>
                                                    </div>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="simple" /></FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <Label className="font-normal">Pay Full Simple Interest</Label>
                                                        <p className="text-xs text-muted-foreground">Principal balance will not increase.</p>
                                                    </div>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="partial" /></FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <Label className="font-normal">Pay a Partial Amount (%)</Label>
                                                        <p className="text-xs text-muted-foreground">Unpaid interest will be capitalized.</p>
                                                    </div>
                                                </FormItem>
                                                 <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="fixed" /></FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <Label className="font-normal">Pay a Fixed Minimum Amount</Label>
                                                        <p className="text-xs text-muted-foreground">Unpaid interest will be capitalized.</p>
                                                    </div>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {(moratoriumInterestType === 'partial' || moratoriumInterestType === 'fixed') && (
                                    <FormField control={form.control} name="moratoriumPaymentAmount" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {moratoriumInterestType === 'partial' ? 'Partial Payment Percentage (%)' : 'Fixed Payment Amount'}
                                            </FormLabel>
                                            <FormControl><Input type="number" placeholder={moratoriumInterestType === 'partial' ? "e.g., 50" : "e.g., 2000"} {...field} value={field.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'personal':
            case 'car':
            case 'home':
                 return (
                    <div className="space-y-6">
                        <FormField control={form.control} name="emisPaid" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of EMIs Already Paid</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 12" {...field} value={field.value ?? ''} /></FormControl>
                                <FormDescription>Total # of payments you have made.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="missedEmis" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Missed EMIs</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 2" {...field} value={field.value ?? ''} /></FormControl>
                                <FormDescription>Of the total EMIs passed, how many were missed?</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                 );
            case 'credit-line':
                return renderTransactions();
            default:
                return null;
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Details</CardTitle>
                <CardDescription>Start by selecting the type of loan you have.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-8">
                        <FormField control={form.control} name="loanType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Loan Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a loan type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="personal">Personal Loan</SelectItem>
                                        <SelectItem value="car">Car Loan</SelectItem>
                                        <SelectItem value="home">Home Loan</SelectItem>
                                        <SelectItem value="education">Education Loan</SelectItem>
                                        <SelectItem value="credit-line">Line of Credit</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {renderCommonFields()}
                        </div>

                        <div className="space-y-6 pt-4 border-t">
                            <h3 className="text-lg font-medium text-primary">Loan-Specific Details</h3>
                            {renderLoanSpecificFields()}
                        </div>

                        {loanType !== 'credit-line' && (
                            <div className="space-y-6 pt-4 border-t">
                                <h3 className="text-lg font-medium text-primary">Advanced Details</h3>
                                {renderDisbursements()}
                                {rateType === 'floating' && (
                                    <div className="pt-6 border-t">
                                        {renderFloatingRateHistory()}
                                    </div>
                                )}
                            </div>
                        )}
                        
                         {serverState?.type === 'error' && serverState.errors?._global && (
                            <FormMessage className="text-center text-lg">{serverState.errors._global[0]}</FormMessage>
                         )}
                         
                         {serverState?.type === 'error' && serverState.errors && !serverState.errors._global && (
                            <div className="text-destructive text-center text-sm">
                                Please correct the errors highlighted above and try again.
                            </div>
                         )}
                        
                        <div className="flex justify-end pt-4">
                            <Button type="submit" size="lg">
                                 <Zap className="mr-2" />
                                 Calculate My Outstanding Balance
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
