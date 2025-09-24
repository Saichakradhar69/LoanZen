
'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculationResult } from './actions';
import { ArrowLeft, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import Link from 'next/link';
import type { ExistingLoanFormData } from './form';

interface ExistingLoanResultsProps {
  results: CalculationResult;
  formData: ExistingLoanFormData;
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
  'credit-line': 'Credit Line',
  custom: 'Custom Loan',
  other: 'Other',
};

const interestTypeLabels: { [key: string]: string } = {
  reducing: 'Reducing Balance',
  flat: 'Flat Rate',
};


export default function ExistingLoanResults({ results, formData, onBack }: ExistingLoanResultsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const loanTypeName = loanTypeLabels[results.loanType] || 'Loan';
  const interestTypeName = interestTypeLabels[results.interestType] || 'Interest';
  
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
                formData: formData,
                formType: 'existing-loan'
            }),
        });

        const { url, error: apiError } = await response.json();

        if (!response.ok) {
            throw new Error(apiError || 'Failed to create checkout session.');
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
        Back to Form
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Loan Statement for: {results.loanName || 'Your Loan'}</CardTitle>
          <CardDescription>Loan Type: {loanTypeName} • Interest Type: {interestTypeName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="schedule">Transaction Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="pt-4">
               <div className="grid md:grid-cols-2 gap-6 text-center">
                    <div className="p-6 bg-secondary rounded-lg">
                        <p className="text-sm text-muted-foreground">Current Outstanding Balance</p>
                        <p className="text-4xl font-bold text-destructive">{formatCurrency(results.outstandingBalance)}</p>
                    </div>
                     <div className="p-6 bg-secondary rounded-lg">
                        <p className="text-sm text-muted-foreground">Projected Total Interest</p>
                        <p className="text-4xl font-bold">{formatCurrency(results.projectedTotalInterest)}</p>
                        <p className="text-xs text-muted-foreground mt-1">({formatCurrency(results.interestPaidToDate)} paid to date)</p>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="schedule">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.schedule.slice(-10).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.date}</TableCell>
                      <TableCell className="capitalize">{item.type.replace('-', ' ')}</TableCell>
                      <TableCell className={`text-right ${item.type.includes('repayment') ? 'text-green-500' : ''}`}>
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(item.endingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               <p className="text-center text-sm text-muted-foreground mt-4">Showing up to the last 10 transactions. Full history available in the report.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-secondary border-primary border-dashed">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-headline text-2xl">Get Your Full Report</CardTitle>
          <CardDescription className="max-w-md">
            Get a detailed, transaction-by-transaction breakdown of your loan's history, plus a downloadable PDF and CSV file.
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
