// src/app/calculator/results.tsx
'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ScenarioResult } from './page';
import { ArrowLeft, Download, Lock } from 'lucide-react';

interface CalculatorResultsProps {
  results: ScenarioResult[];
  onBack: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function CalculatorResults({ results, onBack }: CalculatorResultsProps) {
  const chartData = results.map(result => ({
    name: result.scenarioName,
    'Loan Amount': result.loanAmount,
    'Total Interest': result.totalInterest,
  }));

  return (
    <div className="space-y-8">
       <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2" />
        Back to Calculator
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Loan Comparison</CardTitle>
          <CardDescription>Here's a comparison of the total amount you'll repay for each scenario.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend />
                <Bar dataKey="Loan Amount" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="Total Interest" stackId="a" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Summary</CardTitle>
          <CardDescription>A quick look at the key numbers for each loan scenario.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scenario</TableHead>
                <TableHead className="text-right">Approx. Monthly Payment</TableHead>
                <TableHead className="text-right">Total Interest Paid</TableHead>
                <TableHead className="text-right">Total Repayment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(result => (
                <TableRow key={result.scenarioName}>
                  <TableCell className="font-medium">{result.scenarioName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(result.monthlyPayment)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(result.totalInterest)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(result.totalPayment)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <Button size="lg">
            <Download className="mr-2" />
            Get My Full Report - $3.99
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}