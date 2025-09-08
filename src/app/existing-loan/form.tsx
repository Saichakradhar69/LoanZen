'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Plus, Trash2, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
    type: z.enum(['withdrawal', 'repayment']),
    amount: z.coerce.number().positive('Amount must be positive.')
});

const formSchema = z.object({
    loanType: z.string({ required_error: 'Please select a loan type.' }),
    originalLoanAmount: z.coerce.number().positive('Original loan amount is required.'),
    disbursementDate: z.date({ required_error: 'Disbursement date is required.' }),
    interestRate: z.coerce.number().positive('Interest rate must be positive.').max(100, "Rate seems too high."),
    interestType: z.enum(['reducing', 'flat']),
    emiAmount: z.coerce.number().optional(),

    // Education Loan Specific
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional(),
    disbursements: z.array(disbursementSchema).optional(),

    // Home Loan Specific
    rateChanges: z.array(rateChangeSchema).optional(),

    // Credit Line Specific
    transactions: z.array(transactionSchema).optional(),

    // Personal/Car Loan Specific
    emisPaid: z.coerce.number().min(0, "EMIs paid cannot be negative.").optional()
});

export type ExistingLoanFormData = z.infer<typeof formSchema>;

export default function ExistingLoanForm() {
    const form = useForm<ExistingLoanFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            loanType: 'personal',
            interestType: 'reducing',
            disbursements: [{ date: new Date(), amount: 0 }],
            rateChanges: [{ date: new Date(), rate: 0 }],
            transactions: [{ date: new Date(), type: 'withdrawal', amount: 0 }]
        },
    });

    const loanType = form.watch('loanType');
    
    const { fields: disbursementFields, append: appendDisbursement, remove: removeDisbursement } = useFieldArray({ control: form.control, name: 'disbursements' });
    const { fields: rateChangeFields, append: appendRateChange, remove: removeRateChange } = useFieldArray({ control: form.control, name: 'rateChanges' });
    const { fields: transactionFields, append: appendTransaction, remove: removeTransaction } = useFieldArray({ control: form.control, name: 'transactions' });

    const onSubmit = (data: ExistingLoanFormData) => {
        console.log(data);
        // TODO: Wire up to server action for calculation
    };

    const renderCommonFields = () => (
        <>
            <FormField control={form.control} name="originalLoanAmount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Original Loan Amount</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="disbursementDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Disbursement Date</FormLabel>
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
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 8.5" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="interestType" render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Interest Type</FormLabel>
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
             <FormField control={form.control} name="emiAmount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Monthly Payment (EMI) Amount (Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 1200" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </>
    )

    const renderLoanSpecificFields = () => {
        switch (loanType) {
            case 'education':
                return (
                    <div className="space-y-6">
                        <FormField control={form.control} name="moratoriumPeriod" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Moratorium Period (in months)</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 6" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div>
                             <Label>Disbursements</Label>
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
                                             <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="icon" onClick={() => removeDisbursement(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={() => appendDisbursement({ date: new Date(), amount: 0 })}><Plus className="mr-2" />Add Disbursement</Button>
                            </div>
                        </div>
                    </div>
                )
            case 'home':
                return (
                     <div>
                         <Label>Floating Rate History</Label>
                         <div className="space-y-4 mt-2">
                            {rateChangeFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                                    <FormField control={form.control} name={`rateChanges.${index}.date`} render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Effective Date</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`rateChanges.${index}.rate`} render={({ field }) => (
                                         <FormItem><FormLabel>New Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 9.2" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeRateChange(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={() => appendRateChange({ date: new Date(), rate: 0 })}><Plus className="mr-2" />Add Rate Change</Button>
                        </div>
                    </div>
                )
            case 'credit-line':
                 return (
                     <div>
                         <Label>Transaction History</Label>
                         <div className="space-y-4 mt-2">
                            {transactionFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                                     <FormField control={form.control} name={`transactions.${index}.date`} render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`transactions.${index}.type`} render={({ field }) => (
                                        <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="withdrawal">Withdrawal</SelectItem><SelectItem value="repayment">Repayment</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`transactions.${index}.amount`} render={({ field }) => (
                                        <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeTransaction(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={() => appendTransaction({ date: new Date(), type: 'withdrawal', amount: 0  })}><Plus className="mr-2" />Add Transaction</Button>
                        </div>
                    </div>
                )
            case 'personal':
            case 'car':
                 return (
                    <FormField control={form.control} name="emisPaid" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of EMIs Already Paid (Optional)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 12" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                        <SelectItem value="credit-line">Credit Line</SelectItem>
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
