
'use client';

import { useActionState, startTransition } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { calculateOutstandingBalanceAction } from './actions';
import ExistingLoanForm from './form';
import ExistingLoanResults from './results';
import type { ExistingLoanFormData } from './form';

function ExistingLoanContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const [state, formAction] = useActionState(calculateOutstandingBalanceAction, { type: 'initial' });

  const handleBack = () => {
    startTransition(() => {
      formAction(new FormData());
    });
  };

  const handleCalculate = (data: ExistingLoanFormData) => {
    const formData = new FormData();
    formData.append('form_data_json', JSON.stringify(data));
    startTransition(() => {
        formAction(formData);
    });
  };

  const showResults = state?.type === 'success' && state.data;

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
         <ExistingLoanForm onCalculate={handleCalculate} serverState={state} />
      ) : (
        <ExistingLoanResults results={state.data} formData={state.data.formData} onBack={handleBack}/>
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
