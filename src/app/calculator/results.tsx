// src/app/calculator/results.tsx
'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculationResults } from './page';
import { ArrowLeft, Download, Loader2, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkoutAction } from './actions';
import { useActionState, useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/hooks/use-toast';


interface CalculatorResultsProps {
  results: CalculationResults;
  onBack: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const loanTypeLabels: { [key: string]: string } = {
  home: 'Home Loan',
  car: 'Car Loan',
  personal: 'Personal Loan',
  education: 'Education Loan',
  other: 'Other',
};

const interestRateTypeLabels: { [key: string]: string } = {
  fixed: 'Fixed Rate',
  variable: 'Variable Rate',
  'interest-only': 'Interest Only',
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CalculatorResults({ results, onBack }: CalculatorResultsProps) {
  const [state, formAction] = useActionState(checkoutAction, null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const chartData = results.scenarios.map(result => ({
    name: result.scenarioName,
    'Loan Amount': result.loanAmount,
    'Total Interest': result.totalInterest,
  }));

  const loanTypeName = loanTypeLabels[results.loanType] || 'Loan';
  const interestRateTypeName = interestRateTypeLabels[results.interestRateType] || 'Interest';

  const handleCheckout = () => {
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    async function handleStripeRedirect() {
      if (state?.type === 'success' && state.sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId: state.sessionId });
          if (error) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Could not redirect to Stripe. Please try again.",
            });
            setIsSubmitting(false);
          }
        }
      }
    }

    if(state?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.errors._global?.[0] || 'An unexpected error occurred.',
      });
      setIsSubmitting(false);
    }
    
    handleStripeRedirect();

  }, [state, toast]);


  return (
    <div className="space-y-8">
       <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2" />
        Back to Calculator
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Comparison for: {results.loanName}</CardTitle>
          <CardDescription>Loan Type: {loanTypeName} • Interest Rate: {interestRateTypeName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chart">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">Comparison Chart</TabsTrigger>
              <TabsTrigger value="summary">Summary Table</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="pt-4">
               <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(value as number)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                      cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }}
                    />
                    <Legend iconType="circle"/>
                    <Bar dataKey="Loan Amount" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={80}/>
                    <Bar dataKey="Total Interest" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="summary">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead className="text-right">Monthly Payment</TableHead>
                    <TableHead className="text-right">Total Interest</TableHead>
                    <TableHead className="text-right">Total Repayment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.scenarios.map(result => (
                    <TableRow key={result.scenarioName}>
                      <TableCell className="font-medium">{result.scenarioName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(result.monthlyPayment)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(result.totalInterest)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(result.totalPayment)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-secondary border-primary border-dashed">
        <CardHeader className="items-center text-center">
            <Lock className="w-10 h-10 text-primary mb-2"/>
          <CardTitle className="font-headline text-2xl">Unlock Your Full Report</CardTitle>
          <CardDescription className="max-w-md">
            Get a detailed, month-by-month amortization schedule for each scenario, an Excel download, plus a free 1-month coupon for Tracker Pro to manage your loans after you get one.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <form ref={formRef} action={formAction}>
            <input type="hidden" name="results" value={JSON.stringify(results)} />
            <Button size="lg" className="shadow-lg" onClick={handleCheckout} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Download className="mr-2" />
                  Get My Full Report - $3.99
                </>
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
