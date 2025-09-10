
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CalendarIcon, ChevronDown, Info, Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { CalculationResult } from './actions';


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
    loanName: z.string().optional(),
    originalLoanAmount: z.coerce.number().positive('Original loan amount is required.'),
    disbursementDate: z.date({ required_error: 'Disbursement date is required.' }),
    interestRate: z.coerce.number().positive('Interest rate must be positive.').max(100, "Rate seems too high."),
    interestType: z.enum(['reducing', 'flat']),
    rateType: z.enum(['fixed', 'floating']),
    paymentStructure: z.enum(['fixed', 'variable']).optional(),
    emiAmount: z.coerce.number().optional(),
    moratoriumPeriod: z.coerce.number().min(0, 'Moratorium period cannot be negative.').optional(),
    disbursements: z.array(disbursementSchema).optional(),
    rateChanges: z.array(rateChangeSchema).optional(),
    transactions: z.array(transactionSchema).optional(),
    emisPaid: z.coerce.number().min(0, "EMIs paid cannot be negative.").optional()
});

export type ExistingLoanFormData = z.infer<typeof formSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                </>
            ) : (
                <>
                    <Zap className="mr-2" />
                    Calculate My Outstanding Balance
                </>
            )}
        </Button>
    )
}

interface ExistingLoanFormProps {
    formAction: (prevState: any, formData: FormData) => Promise<{ type: string; errors?: any; data?: CalculationResult; }>;
    state: {
        type: string;
        errors?: any;
        data?: CalculationResult;
    } | null;
}


export default function ExistingLoanForm({ formAction, state: initialState }: ExistingLoanFormProps) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [state, dispatchFormAction] = useActionState(formAction, initialState);

    const form = useForm<ExistingLoanFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            loanType: 'personal',
            interestType: 'reducing',
            rateType: 'fixed',
            originalLoanAmount: '' as any,
            disbursementDate: undefined,
            interestRate: '' as any,
            emiAmount: '' as any,
            moratoriumPeriod: '' as any,
            emisPaid: '' as any,
            loanName: '',
            paymentStructure: 'fixed',
            disbursements: [],
            rateChanges: [],
            transactions: []
        },
    });

    const loanType = form.watch('loanType');
    const rateType = form.watch('rateType');
    const paymentStructure = form.watch('paymentStructure');
    
    const { fields: disbursementFields, append: appendDisbursement, remove: removeDisbursement } = useFieldArray({ control: form.control, name: 'disbursements' });
    const { fields: rateChangeFields, append: appendRateChange, remove: removeRateChange } = useFieldArray({ control: form.control, name: 'rateChanges' });
    const { fields: transactionFields, append: appendTransaction, remove: removeTransaction } = useFieldArray({ control: form.control, name: 'transactions' });

    const clientAction = (formData: FormData) => {
        const data = form.getValues();
        // react-hook-form doesn't serialize complex fields to FormData, so we do it manually.
        formData.append('disbursements', JSON.stringify(data.disbursements));
        formData.append('rateChanges', JSON.stringify(data.rateChanges));
        formData.append('transactions', JSON.stringify(data.transactions));
        dispatchFormAction(formData);
    }
    
    const renderCommonFields = () => (
        <>
            <FormField control={form.control} name="originalLoanAmount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Original Loan Amount</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage>{state?.errors?.originalLoanAmount?.[0]}</FormMessage>
                </FormItem>
            )} />
             <FormField control={form.control} name="disbursementDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>First Disbursement Date</FormLabel>
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
                    <FormMessage>{state?.errors?.disbursementDate?.[0]}</FormMessage>
                </FormItem>
            )} />
            <FormField control={form.control} name="interestRate" render={({ field }) => (
                <FormItem>
                    <FormLabel>Current/Initial Interest Rate (%)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 8.5" {...field} value={field.value ?? ''} /></FormControl>
                     <FormMessage>{state?.errors?.interestRate?.[0]}</FormMessage>
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
             <FormField control={form.control} name="emiAmount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Monthly Payment (EMI) Amount (Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 1200" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage>{state?.errors?.emiAmount?.[0]}</FormMessage>
                </FormItem>
            )} />
        </>
    )
    
    const renderFloatingRateHistory = () => (
        <div>
            <Label>Floating Rate History</Label>
            <CardDescription>If your interest rate has changed over time, add each change here.</CardDescription>
            <div className="space-y-4 mt-2">
            {rateChangeFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                    <FormField control={form.control} name={`rateChanges.${index}.date`} render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Effective Date</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage>{state?.errors?.rateChanges?.[index]?.date?.[0]}</FormMessage></FormItem>
                    )} />
                    <FormField control={form.control} name={`rateChanges.${index}.rate`} render={({ field }) => (
                            <FormItem><FormLabel>New Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 9.2" {...field} value={field.value ?? ''} /></FormControl><FormMessage>{state?.errors?.rateChanges?.[index]?.rate?.[0]}</FormMessage></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeRateChange(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => appendRateChange({ date: new Date(), rate: '' as any })}><Plus className="mr-2" />Add Rate Change</Button>
        </div>
    </div>
    )

    const renderTransactionHistory = (isRepaymentOnly = false) => (
        <div>
             <Label>{isRepaymentOnly ? 'Variable Payments' : 'Transaction History'}</Label>
              <CardDescription>{isRepaymentOnly ? 'Add each payment you have made.' : 'Add all withdrawals and repayments you have made.'}</CardDescription>
             <div className="space-y-4 mt-2">
                {transactionFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg relative">
                         <FormField control={form.control} name={`transactions.${index}.date`} render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage>{state?.errors?.transactions?.[index]?.date?.[0]}</FormMessage></FormItem>
                        )} />
                        {!isRepaymentOnly && (
                        <FormField control={form.control} name={`transactions.${index}.type`} render={({ field }) => (
                            <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="withdrawal">Withdrawal</SelectItem><SelectItem value="repayment">Repayment</SelectItem></SelectContent></Select><FormMessage>{state?.errors?.transactions?.[index]?.type?.[0]}</FormMessage></FormItem>
                        )} />
                        )}
                        <FormField control={form.control} name={`transactions.${index}.amount`} render={({ field }) => (
                            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} /></FormControl><FormMessage>{state?.errors?.transactions?.[index]?.amount?.[0]}</FormMessage></FormItem>
                        )} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeTransaction(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" onClick={() => appendTransaction({ date: new Date(), type: isRepaymentOnly ? 'repayment' : 'withdrawal', amount: '' as any })}><Plus className="mr-2" />Add {isRepaymentOnly ? 'Payment' : 'Transaction'}</Button>
            </div>
        </div>
    )

    const renderDisbursements = () => (
         <div>
             <Label>Disbursements (if more than one)</Label>
             <CardDescription>If your loan was paid out in multiple parts, add them here. If you do, the "Original Loan Amount" field above will be ignored.</CardDescription>
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
                                <FormMessage>{state?.errors?.disbursements?.[index]?.date?.[0]}</FormMessage>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`disbursements.${index}.amount`} render={({ field }) => (
                             <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 25000" {...field} value={field.value ?? ''} /></FormControl><FormMessage>{state?.errors?.disbursements?.[index]?.amount?.[0]}</FormMessage></FormItem>
                        )} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeDisbursement(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendDisbursement({ date: new Date(), amount: '' as any })}><Plus className="mr-2" />Add Disbursement</Button>
            </div>
        </div>
    )


    const renderLoanSpecificFields = () => {
        switch (loanType) {
            case 'education':
                return (
                    <div className="space-y-6">
                        <FormField control={form.control} name="moratoriumPeriod" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Moratorium Period (in months)</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 6" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage>{state?.errors?.moratoriumPeriod?.[0]}</FormMessage>
                            </FormItem>
                        )} />
                        {renderDisbursements()}
                    </div>
                );
            case 'credit-line':
                 return renderTransactionHistory(false);
            case 'custom':
                 return (
                    <div className="space-y-6">
                         <FormField control={form.control} name="loanName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Loan Nickname (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., Personal Loan from Dad" {...field} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="paymentStructure" render={({ field }) => (
                             <FormItem className="space-y-3">
                                 <FormLabel>How do you make payments?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="fixed" /></FormControl>
                                            <Label className="font-normal">Fixed Amount (e.g., Monthly EMI)</Label>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="variable" /></FormControl>
                                            <Label className="font-normal">Variable Amounts</Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                             </FormItem>
                        )} />
                       
                        {paymentStructure === 'fixed' && (
                             <FormField control={form.control} name="emiAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fixed Payment Amount</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} /></FormControl>
                                </FormItem>
                            )} />
                        )}
                        {paymentStructure === 'variable' && (
                            renderTransactionHistory(true)
                        )}
                        
                        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                            <CollapsibleTrigger asChild>
                                <Button type="button" variant="link" className="p-0">
                                    <Plus className="mr-2"/>
                                    Add more details (optional)
                                    <ChevronDown className="ml-2 h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-6 pt-4 animate-in fade-in-0">
                                <FormField control={form.control} name="moratoriumPeriod" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Moratorium Period (in months)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 6" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage>{state?.errors?.moratoriumPeriod?.[0]}</FormMessage>
                                    </FormItem>
                                )} />
                               {renderDisbursements()}
                               {renderFloatingRateHistory()}
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                 );
            case 'personal':
            case 'car':
            case 'home':
                 return (
                    <FormField control={form.control} name="emisPaid" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of EMIs Already Paid (Optional)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 12" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage>{state?.errors?.emisPaid?.[0]}</FormMessage>
                        </FormItem>
                    )} />
                );
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
                    <form action={clientAction} className="space-y-8">
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
                                        <SelectItem value="custom">Custom Loan</SelectItem>
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
                             {rateType === 'floating' && loanType !== 'custom' && (
                                <div className="pt-6 border-t">
                                    {renderFloatingRateHistory()}
                                </div>
                            )}
                        </div>
                        
                         {state?.type === 'error' && state.errors?._global && (
                            <FormMessage className="text-center text-lg">{state.errors._global[0]}</FormMessage>
                         )}
                         
                         {state?.type === 'error' && state.errors && !(Object.keys(state.errors).length === 1 && state.errors._global) && (
                            <div className="text-destructive text-center text-sm">
                                Please correct the errors highlighted above and try again.
                            </div>
                         )}
                        
                        <div className="flex justify-end pt-4">
                           <SubmitButton />
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
