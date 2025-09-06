
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { CalculationResults } from '@/app/api/stripe/webhook/route';
import ReportTemplate from '@/app/calculator/report-template';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [reportData, setReportData] = useState<CalculationResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found. Cannot verify purchase.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/stripe/webhook?session_id=${sessionId}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch report data.');
            }
            const data: CalculationResults = await res.json();
            setReportData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [sessionId]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
        const canvas = await html2canvas(reportRef.current, {
            scale: 2, // Higher scale for better quality
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('LoanZen-Report.pdf');

    } catch (e) {
        console.error("PDF Generation Error: ", e);
        setError("Sorry, there was an error generating the PDF.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // TODO: Add CSV Download Handler

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 flex items-center justify-center min-h-[60vh]">
      <Card className="text-center w-full">
        <CardHeader>
          <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-16 w-16 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">Payment Successful!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for your purchase. Your report is ready to download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center gap-4 p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Retrieving your calculation data...</p>
            </div>
          )}

          {error && (
             <div className="flex flex-col items-center gap-4 p-8 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-destructive font-semibold">Could not load report data</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          )}

          {reportData && !error && (
             <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleDownloadPdf} disabled={isGenerating} size="lg">
                        {isGenerating ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : (
                            <><Download className="mr-2"/> Download PDF Report</>
                        )}
                    </Button>
                     <Button size="lg" variant="secondary" disabled>
                        <FileText className="mr-2"/>
                        Download CSV
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
      
      {/* Hidden component used for PDF generation */}
      <div className="absolute top-0 left-0 -z-50 opacity-0" aria-hidden="true">
        <div ref={reportRef}>
            {reportData && <ReportTemplate reportData={reportData} />}
        </div>
      </div>
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
