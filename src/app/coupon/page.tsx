'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LOANZEN_TRIAL_COUPON_CODE } from '@/lib/coupon-code';

export default function CouponPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <Card className="w-full bg-secondary border-dashed border-primary border-2">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center border-4 border-primary/20 mb-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline">LoanZen Tracker Pro</CardTitle>
            <CardDescription className="text-lg mt-2">
              14-Day Free Trial Coupon Code
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-background border-dashed border-2 border-muted-foreground p-6 rounded-lg inline-block">
              <p className="text-4xl font-mono tracking-widest text-primary font-bold">
                {LOANZEN_TRIAL_COUPON_CODE}
              </p>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-muted-foreground">
                Use this exclusive coupon code to get a <strong>14-day free trial</strong> of LoanZen Tracker Pro.
              </p>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2 text-left">
                <p className="font-semibold text-sm mb-2">What you'll get:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Track all your loans in one place</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>AI-powered prepayment advice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Detailed payment tracking and history</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Smart recommendations to save on interest</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/signup">
                  Create Account & Redeem Code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <div>
                <Button variant="outline" asChild>
                  <Link href="/">
                    Return to Homepage
                  </Link>
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6 max-w-md mx-auto">
              To redeem, create a new account and enter this code during signup on the billing page. 
              The code is valid for new accounts only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

