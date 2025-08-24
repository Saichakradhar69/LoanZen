'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getAdviceAction } from './actions';
import { useEffect, useRef } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PrepaymentAdvisorFormSchema = z.object({
  income: z.string().min(1, { message: 'Monthly income is required.' }),
  loans: z.array(
    z.object({
      loanName: z.string().min(1, { message: 'Loan name is required.' }),
      outstandingBalance: z.string().min(1, { message: 'Balance is required.' }),
      interestRate: z.string().min(1, { message: 'Interest rate is required.' }),
      minimumPayment: z.string().min(1, { message: 'Minimum payment is required.' }),
    })
  ),
});

type AdvisorFormValues = z.infer<typeof PrepaymentAdvisorFormSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Advice...
                </>
            ) : (
                <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get AI Advice
                </>
            )}
        </Button>
    )
}


export default function AdvisorForm() {
  const [state, formAction] = useFormState(getAdviceAction, null);
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);


  const form = useForm<AdvisorFormValues>({
    resolver: zodResolver(PrepaymentAdvisorFormSchema),
    defaultValues: {
      income: '',
      loans: [{ loanName: '', outstandingBalance: '', interestRate: '', minimumPayment: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'loans',
  });

  const onSubmit = (data: AdvisorFormValues) => {
    const formData = new FormData();
    formData.append('income', data.income);
    formData.append('loans', JSON.stringify(data.loans));
    formAction(formData);
  };
  
  useEffect(() => {
    if (state?.type === 'error' && state.errors?._global) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.errors._global[0],
      })
    }
    if (state?.type === 'success' && state.data?.advice) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state, toast]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your Financial Details</CardTitle>
          <CardDescription>
            Provide your income and loan information so our AI can tailor its advice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Take-Home Income</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 4000" {...field} />
                    </FormControl>
                     <FormMessage>{state?.errors?.income?.[0]}</FormMessage>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Your Loans</FormLabel>
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4 space-y-4 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <FormField
                          control={form.control}
                          name={`loans.${index}.loanName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Loan Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Car Loan" {...field} />
                              </FormControl>
                              <FormMessage>{state?.errors?.loans?.[index]?.loanName}</FormMessage>
                            </FormItem>
                          )}
                        />
                       <FormField
                          control={form.control}
                          name={`loans.${index}.outstandingBalance`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Outstanding Balance ($)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 15000" {...field} />
                              </FormControl>
                               <FormMessage>{state?.errors?.loans?.[index]?.outstandingBalance}</FormMessage>
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`loans.${index}.interestRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Interest Rate (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 4.5" {...field} />
                              </FormControl>
                              <FormMessage>{state?.errors?.loans?.[index]?.interestRate}</FormMessage>
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`loans.${index}.minimumPayment`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Payment ($)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 250" {...field} />
                              </FormControl>
                               <FormMessage>{state?.errors?.loans?.[index]?.minimumPayment}</FormMessage>
                            </FormItem>
                          )}
                        />
                    </div>
                     {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove loan</span>
                      </Button>
                    )}
                  </div>
                ))}

                 <FormMessage>{state?.errors?.loans?.[0]}</FormMessage>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ loanName: '', outstandingBalance: '', interestRate: '', minimumPayment: '' })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Loan
                </Button>
              </div>

              <div className="flex justify-end">
                <SubmitButton />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {state?.type === 'success' && state.data?.advice && (
        <div ref={resultsRef} className="mt-12">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-accent h-6 w-6"/>
                        <CardTitle className="font-headline text-2xl text-primary">Your Repayment Strategy</CardTitle>
                    </div>
                    <CardDescription>Here is your personalized debt repayment advice from our AI.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap font-body">
                        {state.data.advice}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </>
  );
}
