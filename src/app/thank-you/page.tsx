
'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Loader2, Sheet } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isGenerating, setIsGenerating] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found. Cannot verify purchase.");
      setIsGenerating(false);
      return;
    }

    // In a real app, you would use a real-time listener (like Firebase's onSnapshot)
    // to wait for the webhook to update a document in the database with the download URL.
    // For this simulation, we'll just use a timeout to mimic the report generation time.
    const generationTimeout = setTimeout(() => {
      // Here you would get the real downloadUrls from your database.
      // We'll simulate a success. In a real app, you would need to handle errors.
      // For the demo, we point to the webhook itself which will regenerate the report.
      const simulatedPdfUrl = `/api/stripe/webhook?session_id=${sessionId}&download=true&format=pdf`;
      const simulatedCsvUrl = `/api/stripe/webhook?session_id=${sessionId}&download=true&format=csv`;
      setPdfUrl(simulatedPdfUrl);
      setCsvUrl(simulatedCsvUrl);
      setIsGenerating(false);
    }, 5000); // 5-second delay to simulate PDF generation and email sending

    return () => clearTimeout(generationTimeout);
  }, [sessionId]);

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
          {isGenerating && (
            <div className="flex flex-col items-center gap-4 p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your personalized reports... <br/>This may take a moment. Your reports will also be sent to your email.</p>
            </div>
          )}

          {error && (
            <p className="text-destructive">{error}</p>
          )}

          {!isGenerating && pdfUrl && csvUrl && (
             <div className="space-y-4">
                <p>Your full loan reports have been generated and sent to your email address.</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg">
                        <Link href={pdfUrl} download="LoanZen-Report.pdf">
                            <Download className="mr-2"/>
                            Download PDF Report
                        </Link>
                    </Button>
                     <Button asChild size="lg" variant="secondary">
                        <Link href={csvUrl} download="LoanZen-Report.csv">
                            <Sheet className="mr-2"/>
                            Download CSV Report
                        </Link>
                    </Button>
                </div>
            </div>
          )}

          <div className="pt-6">
             <Button asChild variant="outline">
                <Link href="/">Return to Homepage</Link>
             </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

export default function ThankYouPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ThankYouContent />
        </Suspense>
    )
}
