
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 flex items-center justify-center min-h-[60vh]">
      <Card className="text-center w-full">
        <CardHeader>
          <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-16 w-16 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">Payment Successful!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for your purchase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Your full loan report is being generated and has been sent to your email address.</p>
          <p className="text-muted-foreground text-sm">If you don&apos;t see it within a few minutes, please check your spam folder.</p>
          <Button asChild className="mt-4">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
