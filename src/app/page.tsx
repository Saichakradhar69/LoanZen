import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calculator, Check, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="w-full bg-background py-16 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Your Financial Command Center
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  LoanZen helps you understand your existing loans and plan for the future. Track everything in one place and get AI-powered advice to become debt-free faster.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href="/advisor">Get AI Prepayment Advice</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                   <Link href="#">Use Loan Calculator</Link>
                </Button>
              </div>
            </div>
            <Image
              src="https://placehold.co/600x400.png"
              width="600"
              height="400"
              alt="Hero"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
              data-ai-hint="financial dashboard"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-secondary">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Take Control of Your Debt</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                From tracking multiple loans to simulating prepayment scenarios, LoanZen provides the tools you need for financial clarity.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
            <Card className="h-full">
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-primary mb-2"/>
                <CardTitle>Multi-Loan Dashboard</CardTitle>
                <CardDescription>Aggregate all your loans—mortgage, auto, student—into a single, unified view.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="h-full">
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-2"/>
                <CardTitle>Prepayment Simulator</CardTitle>
                <CardDescription>See how extra payments impact your payoff date and total interest saved. Instantly.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="h-full">
              <CardHeader>
                <Sparkles className="w-10 h-10 text-primary mb-2"/>
                <CardTitle>AI-Powered Advice</CardTitle>
                <CardDescription>Our GenAI advisor analyzes your financial situation to recommend optimal repayment strategies.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full py-16 md:py-24 lg:py-32">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight">
              The Right Plan for Your Financial Journey
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Start for free, get a one-time report, or unlock the full power of LoanZen with our subscription.
            </p>
          </div>
          <div className="mx-auto grid max-w-sm gap-8 pt-12 sm:max-w-4xl sm:grid-cols-2 lg:grid-cols-3 lg:max-w-none">
            <Card>
              <CardHeader>
                <CardTitle>Calculator</CardTitle>
                <CardDescription>For quick, one-time calculations.</CardDescription>
                <div className="text-4xl font-bold mt-4">$4.99</div>
                <div className="text-xs text-muted-foreground">One-time purchase</div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Detailed Amortization Schedule</div>
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> PDF/Excel Export</div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Purchase Report</Button>
              </CardFooter>
            </Card>
            <Card className="border-primary border-2 shadow-lg">
              <CardHeader>
                <CardTitle>Tracker Pro</CardTitle>
                <CardDescription>The ultimate tool for proactive financial management.</CardDescription>
                <div className="text-4xl font-bold mt-4">$9.99<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <div className="text-xs text-muted-foreground">7-day free trial</div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Track Unlimited Loans</div>
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Prepayment Simulator</div>
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Prepayment Advisor (GenAI)</div>
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Unlimited PDF/Excel Exports</div>
                <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Email Reminders & Alerts</div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Start Free Trial</Button>
              </CardFooter>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Free Tier</CardTitle>
                <CardDescription>A simple, instant calculation.</CardDescription>
                <div className="text-4xl font-bold mt-4">Free</div>
                <div className="text-xs text-muted-foreground">No sign-up required</div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                 <div className="flex items-center gap-2"><Check className="text-primary w-4 h-4"/> Instant Total Outstanding Amount</div>
                 <div className="flex items-center gap-2 text-muted-foreground"><Check className="w-4 h-4"/> No breakdowns</div>
                 <div className="flex items-center gap-2 text-muted-foreground"><Check className="w-4 h-4"/> No saving loans</div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="w-full">
                  <Link href="#">Calculate Now</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
