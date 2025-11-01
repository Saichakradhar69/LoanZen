
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


// Helper function to sanitize formData for JSON serialization
function sanitizeFormData(data: any): any {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitizeFormData);
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeFormData(data[key]);
      }
    }
    return sanitized;
  }
  return data;
}

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
  
   const handleCheckoutLink = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
        // Sanitize formData to ensure all Date objects and nested structures are serializable
        const sanitizedFormData = sanitizeFormData(formData);
        
        const response = await fetch('/api/checkout_sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                appUrl: window.location.origin,
                formData: sanitizedFormData,
                formType: 'new-loan',
            }),
        });

        // Check content type first to decide how to parse
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        // Check if response is OK before parsing
        if (!response.ok) {
            if (isJson) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session.');
            } else {
                // If it's HTML (error page), read as text
                const text = await response.text();
                throw new Error(`Server error (${response.status}): ${response.statusText}`);
            }
        }

        // Parse JSON only if response is OK
        if (!isJson) {
            throw new Error('Unexpected response format from server.');
        }

        const data = await response.json();
        const { url, error: apiError } = data;

        if (apiError) {
            throw new Error(apiError);
        }

        if (!url) {
            throw new Error('No checkout URL received from server.');
        }

        setCheckoutUrl(url);

    } catch (error) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       if (errorMessage.includes('Metadata values can have up to 500 characters')) {
         setError(`Error: The loan scenario is too complex to process in one transaction. Please simplify and try again.`);
       } else {
         setError(`Error: Could not process payment. Please try again. Details: ${errorMessage}`);
       }
    } finally {
      setIsSubmitting(false);
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
            {!checkoutUrl ? (
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
            ) : (
                <Button size="lg" className="shadow-lg" asChild>
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2"/>
                        Proceed to Secure Payment
                    </a>
                </Button>
            )}
            {error && <p className="text-destructive text-center text-sm pt-4">{error}</p>}
        </CardFooter>
      </Card>
    </div>
  );
}
