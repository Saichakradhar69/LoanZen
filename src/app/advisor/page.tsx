import AdvisorForm from './form';

export default function PrepaymentAdvisorPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          AI Prepayment Advisor
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Let our AI analyze your financial situation and recommend an optimal debt repayment strategy.
        </p>
      </div>
      <AdvisorForm />
    </div>
  );
}
