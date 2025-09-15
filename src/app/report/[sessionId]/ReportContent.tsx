
'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Loader2, FileText, AlertCircle, Gift, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import type { CalculationResults as ReportDataType, NewLoanCalculationResults, ExistingLoanReportResults } from '@/app/api/stripe/webhook/route';
import ReportTemplate from '@/app/calculator/report-template';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getReportInsights, ReportInsightsInput } from '@/ai/flows/report-insights';


function ReportContent({ sessionId }: { sessionId: string }) {
  const [reportData, setReportData] = useState<ReportDataType | null>(null);
  const [aiActionPlan, setAiActionPlan] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
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
            let data: ReportDataType = await res.json();
            // Inject session ID into data for the report
            (data as any).sessionId = sessionId;
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

   // Effect to fetch AI insights after reportData is loaded
  useEffect(() => {
    if (!reportData) return;

    const fetchAiInsights = async () => {
      setIsLoadingAi(true);
      setAiError(null);
      try {
        let insightsInput: ReportInsightsInput;

        if (reportData.formType === 'new-loan') {
          const data = reportData as NewLoanCalculationResults;
          const bestScenario = [...data.scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0];
          const worstScenario = [...data.scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0];
          
          const baseMonths = bestScenario.loanTerm * 12;
          const whatIf50 = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, 50);
          const whatIf100 = calculateWhatIf(bestScenario.loanAmount, bestScenario.monthlyPayment, bestScenario.interestRate, baseMonths, bestScenario.totalInterest, 100);

          insightsInput = {
            loanType: 'new-loan',
            bestScenarioName: bestScenario.scenarioName,
            savingsComparedToWorst: worstScenario.totalInterest - bestScenario.totalInterest,
            whatIfScenarios: [
              { name: '+ $50/mo', monthsSaved: whatIf50.monthsSaved, interestSaved: whatIf50.interestSaved },
              { name: '+ $100/mo', monthsSaved: whatIf100.monthsSaved, interestSaved: whatIf100.interestSaved },
            ].filter(s => s.monthsSaved > 0),
          };
        } else { // 'existing-loan'
          const data = reportData as ExistingLoanReportResults;
          const lastRepayment = [...data.schedule].reverse().find(s => s.type === 'repayment');
          const baseMonthlyPayment = lastRepayment ? lastRepayment.amount : (data.outstandingBalance > 0 ? data.outstandingBalance / 120 : data.originalLoanAmount / 120); 
          const baseScenario = calculateWhatIf(data.outstandingBalance, baseMonthlyPayment, data.interestRate, 0, 0);
          const totalMonthsFromNow = isFinite(baseScenario.months) ? baseScenario.months : 0;
          const totalInterestFromNow = isFinite(baseScenario.totalInterest) ? baseScenario.totalInterest : 0;
          
          const projectedPayoffDate = new Date();
           if (isFinite(totalMonthsFromNow)) {
                projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + totalMonthsFromNow);
           }

          const whatIf50 = calculateWhatIf(data.outstandingBalance, baseMonthlyPayment, data.interestRate, totalMonthsFromNow, totalInterestFromNow, 50);
          const whatIf100 = calculateWhatIf(data.outstandingBalance, baseMonthlyPayment, data.interestRate, totalMonthsFromNow, totalInterestFromNow, 100);
          
          insightsInput = {
            loanType: 'existing-loan',
            projectedPayoffDate: isFinite(totalMonthsFromNow) ? projectedPayoffDate.toLocaleDateString() : 'N/A',
            whatIfScenarios: [
              { name: '+ $50/mo', monthsSaved: whatIf50.monthsSaved, interestSaved: whatIf50.interestSaved },
              { name: '+ $100/mo', monthsSaved: whatIf100.monthsSaved, interestSaved: whatIf100.interestSaved },
            ].filter(s => s.monthsSaved > 0),
          };
        }

        const result = await getReportInsights(insightsInput);
        setAiActionPlan(result.actionPlan);
      } catch (err) {
        console.error("AI Insights Error:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while generating AI insights.";
        setAiError(errorMessage);
      } finally {
        setIsLoadingAi(false);
      }
    };

    fetchAiInsights();
  }, [reportData]);


  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
        const reportElement = reportRef.current;
        const pdf = new jsPDF('p', 'px', 'a4');
        const pageElements = reportElement.querySelectorAll('.pdf-page') as NodeListOf<HTMLElement>;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        for (let i = 0; i < pageElements.length; i++) {
            const pageElement = pageElements[i];
            await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for rendering
            
            const canvas = await html2canvas(pageElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: pageElement.offsetWidth,
                height: pageElement.offsetHeight,
                windowWidth: pageElement.scrollWidth,
                windowHeight: pageElement.scrollHeight,
                scrollX: 0,
                scrollY: 0, // Set scrollY to 0
                backgroundColor: null, // Use element's background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }

        pdf.save('LoanZen-Report.pdf');

    } catch (e) {
        console.error("PDF Generation Error: ", e);
        setError("Sorry, there was an error generating the PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!reportData) return;

    let csvContent = '';
    const today = new Date().toISOString().split('T')[0];

    if (reportData.formType === 'new-loan') {
        const data = reportData as NewLoanCalculationResults;
        const lines: string[] = [];
        lines.push('LoanZen - New Loan Comparison Data');
        lines.push(`Generated: ${today} for ${data.userEmail || 'N/A'}`);
        lines.push('');
        lines.push('[SUMMARY]');
        lines.push('Scenario,Loan Amount,Interest Rate (%),Term (Years),Monthly Payment,Total Interest,Total Cost');
        data.scenarios.forEach((s) => {
            lines.push([`"${s.scenarioName.replace(/"/g, '""')}"`, s.loanAmount, s.interestRate, s.loanTerm, s.monthlyPayment, s.totalInterest, s.totalPayment].join(','));
        });
        lines.push('');
        data.scenarios.forEach((s) => {
            lines.push(`[AMORTIZATION_SCHEDULE: ${s.scenarioName.replace(/"/g, '""')}]`);
            lines.push('Month,Payment,Principal,Interest,Remaining Balance');
            s.amortizationSchedule.forEach(p => {
                lines.push([p.month, p.monthlyPayment, p.principal, p.interest, p.remainingBalance].join(','));
            });
            lines.push('');
        });
        csvContent = lines.join('\n');
    } else {
        const data = reportData as ExistingLoanReportResults;
         const lines: string[] = [];
        lines.push('LoanZen - Existing Loan Statement');
        lines.push(`Generated: ${today} for ${data.userEmail || 'N/A'}`);
        lines.push('');
        lines.push('[SUMMARY]');
        lines.push('Metric,Value');
        lines.push(`"Outstanding Balance",${data.outstandingBalance}`);
        lines.push(`"Interest Paid to Date",${data.interestPaidToDate}`);
        lines.push(`"Next EMI Date",${data.nextEmiDate ? new Date(data.nextEmiDate).toLocaleDateString() : 'N/A'}`);
        lines.push(`"Original Loan Amount",${data.originalLoanAmount}`);
        lines.push(`"Interest Rate",${data.interestRate}`);
        lines.push('');
        lines.push('[TRANSACTION_HISTORY]');
        lines.push('Date,Type,Amount,Principal,Interest,Ending Balance,Note');
        data.schedule.forEach(t => {
            lines.push([t.date, t.type, t.amount, t.principal, t.interest, t.endingBalance, `"${t.note || ''}"`].join(','));
        });
        csvContent = lines.join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const fileName = `LoanZen-Report_${today}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };
  
// Helper function for "what-if" calculations, needed for AI prompt
function calculateWhatIf(principal: number, monthlyPayment: number, annualRate: number, baseMonths: number, baseInterest: number, extraMonthly: number = 0) {
    if (principal <= 0) return { months: 0, totalInterest: 0, monthsSaved: baseMonths, interestSaved: baseInterest };
    const monthlyRate = annualRate / 12 / 100;
    let balance = principal;
    let months = 0;
    let totalInterest = 0;
    const fullPayment = monthlyPayment + extraMonthly;

    if (fullPayment <= balance * monthlyRate) return { months: Infinity, totalInterest: Infinity, monthsSaved: 0, interestSaved: 0 };

    while (balance > 0) {
        const interest = balance * monthlyRate;
        const principalPaid = fullPayment - interest;
        balance -= principalPaid;
        totalInterest += interest;
        months++;
        if (months > 1200) return { months: Infinity, totalInterest: Infinity, monthsSaved: 0, interestSaved: 0 };
    }
    return { months, totalInterest, monthsSaved: baseMonths - months, interestSaved: baseInterest - totalInterest };
}

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <Card className="text-center w-full shadow-lg">
        <CardHeader>
          {isLoading ? (
             <div className="mx-auto bg-gray-100 dark:bg-gray-800 rounded-full h-16 w-16 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="mx-auto bg-destructive/10 rounded-full h-16 w-16 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          ) : (
             <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-16 w-16 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          )}
          <CardTitle className="text-3xl font-headline mt-4">
             {isLoading ? 'Verifying Purchase...' : error ? 'Verification Failed' : 'Payment Successful!'}
          </CardTitle>
          <CardDescription className="text-lg">
             {isLoading ? 'Please wait while we retrieve your secure report.' : error ? 'Could not verify your purchase. Please contact support.' : 'Thank you for your purchase. Your report is ready to download.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center gap-4 p-8">
              <p className="text-muted-foreground">Retrieving your calculation data...</p>
            </div>
          )}

          {error && (
             <div className="flex flex-col items-center gap-4 p-8 bg-destructive/10 rounded-lg">
              <p className="text-destructive font-semibold">Error Details</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          )}

          {reportData && !error && (
             <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf} size="lg">
                        {isGeneratingPdf ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...</>
                        ) : (
                            <><Download className="mr-2"/> Download PDF Report</>
                        )}
                    </Button>
                     <Button size="lg" variant="secondary" onClick={handleDownloadCsv}>
                        <FileText className="mr-2"/>
                        Download CSV
                    </Button>
                </div>
                 {isLoadingAi && (
                    <div className="flex items-center justify-center pt-4 text-muted-foreground">
                        <Lightbulb className="mr-2 h-4 w-4 animate-pulse" />
                        Generating your personalized AI insights...
                    </div>
                )}
                 {aiError && (
                    <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-destructive text-sm">
                        <p className="font-bold flex items-center gap-2"><AlertCircle /> Could not generate AI recommendations.</p>
                        <p className="mt-2 text-xs">This might be due to a missing or invalid Gemini API key. Please check your `.env` file and try again.</p>
                        <p className="font-mono text-xs mt-2 bg-black/20 p-2 rounded">Details: {aiError}</p>
                    </div>
                )}
            </div>
          )}

          <div className="pt-6">
             <Button asChild variant="outline">
                <Link href="/">Return to Homepage</Link>
             </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportData && !error && (
        <Card className="w-full bg-secondary border-dashed border-primary">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center border-4 border-primary/20">
                    <Gift className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-headline mt-4">Your Bonus Offer</CardTitle>
                <CardDescription>As a thank you, here is your exclusive code for a 14-day free trial of LoanZen Tracker Pro.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <div className="bg-background border-dashed border-2 border-muted-foreground p-4 rounded-lg inline-block">
                    <p className="text-3xl font-mono tracking-widest text-primary">{reportData.couponCode}</p>
                </div>
                <p className="text-muted-foreground mt-4 text-sm max-w-md mx-auto">
                    To redeem, create an account and enter this code on the billing page. Enjoy tracking your loans and finding more ways to save!
                </p>
            </CardContent>
        </Card>
      )}


      {/* Hidden component used for PDF generation */}
      <div className="fixed -top-[20000px] left-0 -z-50 opacity-1" aria-hidden="true">
        <div ref={reportRef}>
            {reportData && <ReportTemplate reportData={reportData} aiActionPlan={aiActionPlan || undefined} />}
        </div>
      </div>
    </div>
  );
}

export default ReportContent;

    