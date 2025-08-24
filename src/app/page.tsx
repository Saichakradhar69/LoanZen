import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Check, Download, Globe, Lock, PenSquare, X, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col dark">
      {/* Hero Section */}
      <section className="w-full bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col justify-center space-y-4 p-8 md:p-12 bg-primary text-primary-foreground">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                What's My Exact Balance?
              </h1>
              <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">
                Already have a loan? Find your precise outstanding amount and interest paid in seconds.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link href="/calculator">Check Existing Loan →</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4 p-8 md:p-12 bg-green-theme-primary text-green-theme-primary-foreground">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                Plan Your Future Loan?
              </h1>
              <p className="max-w-[600px] text-green-theme-primary-foreground/80 md:text-xl">
                Thinking of borrowing? Compare options and see the true cost before you sign.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" variant="secondary" className="bg-green-theme-primary-foreground text-green-theme-primary hover:bg-green-theme-primary-foreground/90">
                  <Link href="/calculator">Estimate New Loan →</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center py-4 text-sm text-muted-foreground">
            Trusted by over 15,000 borrowers in 30+ countries
          </div>
        </div>
      </section>
      
      {/* Dashboard Teaser Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-secondary">
        <div className="container px-4 md:px-6 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Your Personal Loan Dashboard Awaits</h2>
            <p className="max-w-[900px] mx-auto text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4">
              Upgrade to Tracker Pro to see all your loans in one place, track your payoff progress, and save thousands.
            </p>
            <div className="relative mt-8 max-w-4xl mx-auto">
                <Image 
                    src="https://placehold.co/1000x600.png"
                    width={1000}
                    height={600}
                    alt="Dashboard Preview"
                    className="rounded-lg shadow-lg blur-sm"
                    data-ai-hint="financial dashboard chart"
                />
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center flex-col p-8">
                     <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-white max-w-md w-full border border-white/20">
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
                    <Button size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
                        <Lock className="mr-2"/>
                        Unlock My Dashboard →
                    </Button>
                </div>
            </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-16 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Get Your Answer in 3 Simple Steps</h2>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-3 md:gap-12 mt-12">
            <div className="grid gap-1">
              <div className="flex justify-center items-center">
                <PenSquare className="w-12 h-12 text-primary mb-4"/>
                <div className="font-bold text-5xl text-muted-foreground/30 ml-2">1</div>
              </div>
              <h3 className="text-lg font-bold">Enter Your Details</h3>
              <p className="text-sm text-muted-foreground">Tell us about your loan—amount, rate, and dates.</p>
            </div>
            <div className="grid gap-1">
                <div className="flex justify-center items-center">
                    <Zap className="w-12 h-12 text-primary mb-4"/>
                    <div className="font-bold text-5xl text-muted-foreground/30 ml-2">2</div>
                </div>
              <h3 className="text-lg font-bold">Get Your Free Estimate</h3>
              <p className="text-sm text-muted-foreground">See your total outstanding balance instantly.</p>
            </div>
            <div className="grid gap-1">
                <div className="flex justify-center items-center">
                    <Lock className="w-12 h-12 text-primary mb-4"/>
                    <div className="font-bold text-5xl text-muted-foreground/30 ml-2">3</div>
                </div>
              <h3 className="text-lg font-bold">Unlock the Full Picture</h3>
              <p className="text-sm text-muted-foreground">Upgrade to see the full schedule and export reports.</p>
            </div>
          </div>
          <Button asChild size="lg" className="mt-12">
            <Link href="/calculator">Start Calculating - No Signup Required</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-secondary">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose LoanZen?</h2>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 mt-12">
            <div className="flex items-start gap-4">
              <Globe className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Global & Multi-Currency</h3>
                <p className="text-sm text-muted-foreground">Calculate loans in USD, EUR, GBP, INR, and more.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <BarChart3 className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Handles Complex Loans</h3>
                <p className="text-sm text-muted-foreground">Accurate calculations for Fixed, Floating, and Interest-Only loans.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Lock className="w-10 h-10 text-primary mt-1"/>
              <div>
                <h3 className="text-lg font-bold">Your Data is Secure</h3>
                <p className="text-sm text-muted-foreground">Bank-grade encryption. Your data is never sold.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
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
            <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Simple, Transparent Pricing
            </h2>
          </div>
          <div className="mx-auto grid max-w-sm gap-8 pt-12 sm:max-w-4xl sm:grid-cols-3 lg:max-w-none">
            <Card>
              <CardHeader className="items-center">
                <CardTitle>Free Tier</CardTitle>
                <div className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/forever</span></div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Basic calculation</div>
                <div className="flex items-center gap-2 text-muted-foreground"><X className="text-red-500 w-4 h-4"/> No breakdown</div>
                <div className="flex items-center gap-2 text-muted-foreground"><X className="text-red-500 w-4 h-4"/> No export</div>
              </CardContent>
              <CardFooter>
                 <Button variant="outline" asChild className="w-full">
                  <Link href="/calculator">Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="border-primary border-2 shadow-lg relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">MOST POPULAR</div>
              <CardHeader  className="items-center">
                <CardTitle>One-Time Report</CardTitle>
                <div className="text-4xl font-bold">$4.99<span className="text-lg font-normal text-muted-foreground">/one-time</span></div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Everything in Free</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Full amortization schedule</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Download PDF/Excel</div>
                <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Floating rate calculations</div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Buy Now</Button>
              </CardFooter>
            </Card>
             <Card>
              <CardHeader className="items-center">
                <CardTitle>Tracker Pro</CardTitle>
                <div className="text-4xl font-bold">$9.99<span className="text-lg font-normal text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Everything in One-Time</div>
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Save & track unlimited loans</div>
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Prepayment advisor</div>
                 <div className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4"/> Email reminders</div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Subscribe & Save</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
