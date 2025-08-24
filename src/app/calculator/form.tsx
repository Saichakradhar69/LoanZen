// src/app/calculator/form.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BarChart3, Plus, Trash2 } from 'lucide-react';

const scenarioSchema = z.object({
  scenarioName: z.string().min(1, 'Scenario name is required.'),
  loanAmount: z.coerce.number().positive('Loan amount must be a positive number.'),
  interestRate: z.coerce.number().positive('Interest rate must be a positive number.').max(100, "Interest rate seems too high."),
  loanTerm: z.coerce.number().positive('Loan term must be a positive number.').max(50, "Loan term seems too long."),
});

const formSchema = z.object({
  scenarios: z.array(scenarioSchema).min(1, 'Please add at least one scenario.'),
});

export type FormData = z.infer<typeof formSchema>;

interface CalculatorFormProps {
  onCalculate: (data: FormData) => void;
}

export default function CalculatorForm({ onCalculate }: CalculatorFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scenarios: [{ scenarioName: 'Scenario 1', loanAmount: 10000, interestRate: 5, loanTerm: 10 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'scenarios',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Loan Scenarios</CardTitle>
        <CardDescription>Add one or more scenarios to compare. You can compare different loan amounts, interest rates, and terms.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCalculate)}>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-4 relative pt-8">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove scenario</span>
                  </Button>
                )}
                <FormField
                  control={form.control}
                  name={`scenarios.${index}.scenarioName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scenario Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bank A Offer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`scenarios.${index}.loanAmount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 250000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`scenarios.${index}.interestRate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g., 3.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`scenarios.${index}.loanTerm`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Term (Years)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
             <FormMessage>{form.formState.errors.scenarios?.message}</FormMessage>

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ scenarioName: `Scenario ${fields.length + 1}`, loanAmount: 10000, interestRate: 5, loanTerm: 10 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Scenario
            </Button>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">
              <BarChart3 className="mr-2" />
              Compare My Loan Options
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}