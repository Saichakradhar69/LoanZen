
'use client';

import { useActionState, useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { calculateOutstandingBalanceAction, CalculationResult } from './actions';
import ExistingLoanForm from './form';
import ExistingLoanResults from './results';
import type { ExistingLoanFormData } from './form';

function ExistingLoanContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const [state, formAction] = useActionState(calculateOutstandingBalanceAction, null);
  const [formData, setFormData] = useState<ExistingLoanFormData | null>(null);

  const handleBack = () => {
    // This will reset the state, causing the form to be shown again.
    (formAction as any)(null); // A bit of a hack to reset the action state
    setFormData(null);
     // Clear the status from the URL to hide the alert
    window.history.replaceState(null, '', '/existing-loan');
  };

  const showResults = state?.type === 'success' && state.data && formData;
  
  const handleFormSubmit = (data: FormData) => {
    const values = new FormData(data.currentTarget as HTMLFormElement);
    const formValues = Object.fromEntries(values.entries());
    
    // This is a bit of a hack to get the form data for the results page
    const tempFd = new FormData();
    const currentData = new FormData(data.currentTarget as HTMLFormElement);
    currentData.forEach((value, key) => {
        tempFd.append(key, value);
    });

    const fData: any = {};
     for (const [key, value] of tempFd.entries()) {
        if (key.endsWith('Date')) {
             fData[key] = new Date(value as string);
        } else if (['disbursements', 'rateChanges', 'transactions'].includes(key)) {
            fData[key] = JSON.parse(value as string).map((item: any) => ({
                ...item,
                date: new Date(item.date)
            }));
        } else if (value && typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(Number(value)) && !key.startsWith('$ACTION')) {
            fData[key] = parseFloat(value);
        } else {
            if(!key.startsWith('$ACTION'))
                fData[key] = value;
        }
    }
    setFormData(fData);


    formAction(data);
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
       {status === 'cancelled' && (
         <Alert variant="destructive" className="mb-8">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Payment Cancelled</AlertTitle>
            <AlertDescription>
                Your payment was not processed. You can try again at any time.
            </AlertDescription>
        </Alert>
      )}
      <div className="text-center mb-10">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Check Your Existing Loan
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Provide your loan details to get an accurate, up-to-date statement of your outstanding balance.
        </p>
      </div>
      
      {!showResults ? (
         <ExistingLoanForm formAction={handleFormSubmit} state={state} />
      ) : (
        <ExistingLoanResults results={state.data as CalculationResult} formData={formData} onBack={handleBack}/>
      )}

    </div>
  );
}


export default function ExistingLoanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ExistingLoanContent />
        </Suspense>
    )
}

    