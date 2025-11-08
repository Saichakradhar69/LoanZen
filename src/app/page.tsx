'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Check, Download, Globe, Lock, PenSquare, X, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useHydrationSafe } from '@/hooks/use-hydration-safe';

export default function HomePage() {
  useHydrationSafe();
  
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-background to-secondary/40 divider-bottom">
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)] bg-[radial-gradient(circle_at_20%_-10%,hsl(var(--primary)/0.25)_0%,transparent_60%),radial-gradient(circle_at_80%_-10%,hsl(var(--primary)/0.15)_0%,transparent_60%)]" />
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="flex flex-col justify-center gap-6 py-16 md:py-24">
              <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Know your loan. Own your future.
              </h1>
              <p className="max-w-xl text-foreground/70 text-lg md:text-xl">
                Precise balances in seconds. Plan new loans with clarity. Track progress beautifully.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/existing-loan">Check Existing Loan</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/calculator">Estimate New Loan</Link>
                </Button>
              </div>
            </div>
            <div className="relative py-10 md:py-24">
              <div className="mx-auto max-w-xl rounded-[24px] border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-2xl">
                <Image 
                  src="/images/hero image.png"
                  width={1000}
                  height={600}
                  alt="LoanZen App Preview"
                  className="rounded-[24px]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Dashboard Teaser Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-plate divider-bottom">
        <div className="container px-4 md:px-6 text-center">
            <h2 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl">Your Personal Loan Dashboard Awaits</h2>
            <p className="max-w-[900px] mx-auto text-foreground/70 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4">
              Upgrade to Tracker Pro to see all your loans in one place, track your payoff progress, and save thousands.
            </p>
            <div className="relative mt-10 max-w-4xl mx-auto">
                <Image 
                    src="https://placehold.co/1000x600.png"
                    width={1000}
                    height={600}
                    alt="Dashboard Preview"
                    className="rounded-2xl shadow-2xl blur-sm"
                    data-ai-hint="financial dashboard chart"
                />
                <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center flex-col p-8">
                     <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl text-white max-w-md w-full border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <span>Progress</span>
                            <span>45%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5 mb-4">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{width: '45%'}}></div>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                            <span>Interest Saved</span>
                            <span>$1,500</span>
                        </div>
                        <Lock className="w-8 h-8 mx-auto mt-4 text-yellow-400"/>
                    </div>
                    <Button size="lg" className="mt-8" asChild>
                        <Link href="/signup">
                            <Lock className="mr-2"/>
                            Unlock My Dashboard →
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-16 md:py-24 lg:py-32 bg-plate-2 divider-bottom">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl">Get Your Report in 3 Simple Steps</h2>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-3 md:gap-12 mt-12">
            <div className="grid gap-1">
              <div className="flex justify-center items-center">
                <PenSquare className="w-12 h-12 text-primary mb-4"/>
                <div className="font-bold text-5xl text-muted-foreground/30 ml-2">1</div>
              </div>
              <h3 className="text-lg font-bold">Enter Loan Details</h3>
              <p className="text-sm text-muted-foreground">Tell us your loan amount, interest rate, and term.</p>
            </div>
            <div className="grid gap-1">
                <div className="flex justify-center items-center">
                    <Zap className="w-12 h-12 text-primary mb-4"/>
                    <div className="font-bold text-5xl text-muted-foreground/30 ml-2">2</div>
                </div>
              <h3 className="text-lg font-bold">Get a Free Preview</h3>
              <p className="text-sm text-muted-foreground">Instantly see a summary of your loan costs.</p>
            </div>
            <div className="grid gap-1">
                <div className="flex justify-center items-center">
                    <Download className="w-12 h-12 text-primary mb-4"/>
                    <div className="font-bold text-5xl text-muted-foreground/30 ml-2">3</div>
                </div>
              <h3 className="text-lg font-bold">Get Your Full Report</h3>
              <p className="text-sm text-muted-foreground">Purchase the complete report, delivered to your email.</p>
            </div>
          </div>
          <Button asChild size="lg" className="mt-12">
            <Link href="/calculator">Start Calculating Now</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-plate">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl">Why Choose LoanZen?</h2>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 mt-12">
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
              <Globe className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Global & Multi-Currency</h3>
                <p className="text-sm text-muted-foreground">Calculate loans in USD, EUR, GBP, INR, and more.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
              <BarChart3 className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Handles Complex Loans</h3>
                <p className="text-sm text-muted-foreground">Accurate calculations for Fixed, Floating, and Interest-Only loans.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
              <Lock className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Your Data is Secure</h3>
                <p className="text-sm text-muted-foreground">Calculations are done on your device. We don't see your data.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
              <Download className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Professional Reports</h3>
                <p className="text-sm text-muted-foreground">Download polished PDF or Excel reports to share.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full py-16 md:py-24 lg:py-32">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">Simple, Transparent Pricing</h2>
          </div>
          <div className="mx-auto grid max-w-sm gap-6 pt-12 sm:max-w-4xl sm:grid-cols-3 lg:max-w-5xl">
            {/* Free */}
            <Card className="elevated transition-all hover:shadow-lg">
              <CardHeader className="items-center space-y-2">
                <div className="text-xs px-3 py-1 rounded-full border bg-card/60">Basic</div>
                <CardTitle className="text-xl">Free Calculator</CardTitle>
                <div className="text-4xl font-bold tracking-tight">$0<span className="text-lg font-normal text-muted-foreground">/forever</span></div>
                <p className="text-sm text-muted-foreground max-w-[18rem]">Perfect for quick estimates and simple comparisons.</p>
                <div className="h-px w-full bg-border/60 mt-2"/>
              </CardHeader>
              <CardContent className="space-y-3 text-left">
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Basic calculation</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> See total interest & payments</div>
                <div className="flex items-center gap-2 text-muted-foreground"><X className="text-red-500 w-4 h-4"/> Full amortization schedule</div>
              </CardContent>
              <CardFooter>
                 <Button variant="outline" asChild className="w-full">
                  <Link href="/calculator">Calculate Now</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* One-time (Featured) */}
            <Card className="relative border-primary/60 ring-2 ring-primary/50 shadow-2xl bg-gradient-to-b from-primary/10 to-background">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs md:text-sm font-semibold rounded-full shadow-sm">Most popular</div>
              <CardHeader  className="items-center space-y-2">
                <div className="text-xs px-3 py-1 rounded-full border bg-card/60">Standard</div>
                <CardTitle className="text-xl">Full Report</CardTitle>
                <div className="text-4xl font-bold tracking-tight">$3.99<span className="text-lg font-normal text-muted-foreground">/one-time</span></div>
                <p className="text-sm text-muted-foreground max-w-[22rem]">Best when you need a detailed breakdown you can share.</p>
                <div className="h-px w-full bg-border/60 mt-2"/>
              </CardHeader>
              <CardContent className="space-y-3 text-left">
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Everything in Free</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Full amortization schedule</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Emailed PDF/Excel report</div>
                <div className="font-semibold text-center pt-2">Plus a free gift</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> 14‑Day Tracker Pro Coupon</div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild><Link href="/calculator">Get Your Report</Link></Button>
              </CardFooter>
            </Card>

            {/* Pro */}
            <Card className="elevated transition-all hover:shadow-lg">
              <CardHeader className="items-center space-y-2">
                <div className="text-xs px-3 py-1 rounded-full border bg-card/60">Pro</div>
                <CardTitle className="text-xl">Tracker Pro</CardTitle>
                 <div className="text-4xl font-bold tracking-tight">$9.99<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <p className="text-sm text-muted-foreground max-w-[18rem]">Ideal for ongoing tracking and AI insights.</p>
                <div className="h-px w-full bg-border/60 mt-2"/>
              </CardHeader>
              <CardContent className="space-y-3 text-left">
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Everything in One‑Time</div>
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Save & track unlimited loans</div>
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> AI Prepayment advisor</div>
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Secure account login</div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild><Link href="/signup">Subscribe & Save</Link></Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
