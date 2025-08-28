// src/app/calculator/results.tsx
'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculationResults } from './page';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import type { FormData } from './form';

interface CalculatorResultsProps {
  results: CalculationResults;
  formData: FormData;
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

export default function CalculatorResults({ results, formData, onBack }: CalculatorResultsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const chartData = results.scenarios.map(result => ({
    name: result.scenarioName,
    'Loan Amount': result.loanAmount,
    'Total Interest': result.totalInterest,
  }));

  const loanTypeName = loanTypeLabels[results.loanType] || 'Loan';
  const interestRateTypeName = interestRateTypeLabels[results.interestRateType] || 'Interest';

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Create a checkout session by calling our API
      const response = await fetch('/api/checkout_sessions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            appUrl: window.location.origin,
            formData: formData // Pass the original form data
          }),
      });

      const { sessionId, error: apiError, url } = await response.json();

      if (!response.ok) {
          throw new Error(apiError || 'Failed to create checkout session.');
      }
      
      const stripe = await stripePromise;
      if (!stripe) {
          throw new Error('Stripe.js has not loaded yet.');
      }
      
      // We are using a link instead of redirectToCheckout to avoid iframe issues
      // in some development environments.
      setCheckoutUrl(url); 

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      
      if (stripeError) {
          console.error("Stripe redirect error:", stripeError);
          throw new Error(stripeError.message);
      }

    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setError(`Error: Could not connect to payment processor. Please try again. Details: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
   const handleCheckoutLink = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
        const response = await fetch('/api/checkout_sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                appUrl: window.location.origin,
                formData: formData 
            }),
        });

        const { sessionId, error: apiError } = await response.json();

        if (!response.ok) {
            throw new Error(apiError || 'Failed to create checkout session.');
        }

        const stripe = await stripePromise;
        if (!stripe) {
            throw new Error('Stripe.js has not loaded yet.');
        }

        // This is the session ID. The full URL is constructed by Stripe.
        // We will now use this to redirect.
        const { error } = await stripe.redirectToCheckout({ sessionId });

        if (error) {
            console.error("Stripe redirect error:", error);
            throw error;
        }

    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setError(`Error: Could not connect to payment processor. Please try again. Details: ${errorMessage}`);
      setIsSubmitting(false); // Only stop loading if there's an error
    }
  };


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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                    <Legend iconType="circle" />
                    <Bar dataKey="Loan Amount" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={80} />
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
          <CardTitle className="font-headline text-2xl">Get Your Full Report</CardTitle>
          <CardDescription className="max-w-md">
            Get a detailed, month-by-month amortization schedule for each scenario and an Excel download.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col">
            <Button size="lg" className="shadow-lg" onClick={handleCheckoutLink} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="mr-2" />
                  Get Full Report for $3.99
                </>
              )}
            </Button>
            {error && <p className="text-destructive text-center text-sm pt-4">{error}</p>}
        </CardFooter>
      </Card>
    </div>
  );
}
