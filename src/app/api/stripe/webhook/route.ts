
// src/app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { FormData as CalculatorFormData } from '@/app/calculator/form';

// Extend the jsPDF type to include the autoTable method
interface jsPDFWithPlugins extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// --- Data types needed for recalculation ---

export type AmortizationData = {
  month: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

export type ScenarioResult = {
  scenarioName: string;
  totalInterest: number;
  totalPayment: number;
  monthlyPayment: number;
  amortizationSchedule: AmortizationData[];
  loanAmount: number;
  interestRate: number;
};

export type CalculationResults = {
  loanName: string;
  loanType: string;
  interestRateType: string;
  scenarios: ScenarioResult[];
};

// --- Calculation logic moved to the server ---

function calculateAmortization(loanAmount: number, annualInterestRate: number, loanTermYears: number) {
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;

  const monthlyPayment =
    (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  let remainingBalance = loanAmount;
  let totalInterest = 0;
  const amortizationSchedule: AmortizationData[] = [];

  for (let month = 1; month <= numberOfPayments; month++) {
    const interest = remainingBalance * monthlyInterestRate;
    const principal = monthlyPayment - interest;
    remainingBalance -= principal;
    totalInterest += interest;

    amortizationSchedule.push({
      month,
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      remainingBalance: parseFloat(Math.abs(remainingBalance).toFixed(2)),
    });
  }

  return {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalPayment: parseFloat((loanAmount + totalInterest).toFixed(2)),
    amortizationSchedule,
  };
}

function performCalculations(formData: CalculatorFormData): CalculationResults {
    const calculatedScenarios = formData.scenarios.map((scenario) => {
      const { monthlyPayment, totalInterest, totalPayment, amortizationSchedule } = calculateAmortization(
        scenario.loanAmount,
        scenario.interestRate,
        scenario.loanTerm
      );
      return {
        scenarioName: scenario.scenarioName,
        totalInterest,
        totalPayment,
        monthlyPayment,
        amortizationSchedule,
        loanAmount: scenario.loanAmount,
        interestRate: scenario.interestRate,
      };
    });
    return {
      loanName: formData.loanName,
      loanType: formData.loanType,
      interestRateType: formData.interestRateType,
      scenarios: calculatedScenarios
    };
}


// --- PDF and Webhook Logic ---

function generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PREMIUM-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function generateReportPdf(results: CalculationResults, userEmail: string): Buffer {
    const doc = new jsPDF() as jsPDFWithPlugins;
    const couponCode = generateCouponCode();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = 14;
    const rightMargin = pageWidth - 14;
    const contentWidth = pageWidth - (leftMargin * 2);
    let yPos = 0;

    // --- Helper Functions for PDF construction ---
    const addHeader = (title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(39, 59, 122); // A slightly darker primary for text
        doc.text('LoanZen', pageWidth / 2, 20, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Muted-foreground
        doc.text(title, pageWidth / 2, 28, { align: 'center' });

        doc.setDrawColor(226, 232, 240); // Border color
        doc.line(leftMargin, 35, rightMargin, 35);
        yPos = 45;
    };

    const addFooter = () => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        for(let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const text = `Page ${i} of ${totalPages} | Report for ${userEmail} | Generated by LoanZen`;
            doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    };
    
    // --- Page 1: Cover Page ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(63, 81, 181); // Primary color
    doc.text('LoanZen', pageWidth / 2, 80, { align: 'center' });

    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0); // Black
    doc.text('Loan Comparison Analysis Report', pageWidth / 2, 110, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Prepared for: ${userEmail}`, pageWidth / 2, 130, { align: 'center' });
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 137, { align: 'center' });

    yPos = 250;
    doc.setFontSize(8);
    doc.setTextColor(150);
    const disclaimerText = 'This report is for informational purposes only. All calculations are estimates based on the data you provided.';
    doc.text(disclaimerText, pageWidth / 2, yPos, { align: 'center', maxWidth: 180 });

    // --- Page 2: Executive Summary ---
    doc.addPage();
    addHeader('Executive Summary');

    if (results.scenarios.length > 1) {
        const bestScenario = [...results.scenarios].sort((a, b) => a.totalPayment - b.totalPayment)[0];
        const worstScenario = [...results.scenarios].sort((a, b) => b.totalPayment - a.totalPayment)[0];
        const interestSavings = worstScenario.totalInterest - bestScenario.totalInterest;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const recommendationText = `Recommendation: "${bestScenario.scenarioName}" @ ${bestScenario.interestRate}% is the most cost-effective option.`;
        doc.text(recommendationText, leftMargin, yPos, { maxWidth: contentWidth });
        yPos += 12;
        
        doc.setFillColor(245, 245, 245); // Light Gray background
        doc.roundedRect(leftMargin, yPos, contentWidth, 20, 3, 3, 'F');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0);
        const findingText = `Choosing this option could save you ${formatCurrency(interestSavings)} in total interest compared to the "${worstScenario.scenarioName}" option.`;
        doc.text(findingText, leftMargin + 6, yPos + 12, { maxWidth: contentWidth - 12 });
        yPos += 30;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const analysisText = "This analysis compares multiple loan options based on the details you provided. The recommendation is based on minimizing the total cost of borrowing over the life of the loan.";
        doc.text(analysisText, leftMargin, yPos, {maxWidth: contentWidth});
        yPos += 20;

        const summaryHead = [['', ...results.scenarios.map(s => `${s.scenarioName} @ ${s.interestRate}%`), 'Difference']];
        const summaryBody = [
            ['Monthly Payment', ...results.scenarios.map(s => formatCurrency(s.monthlyPayment)), formatCurrency(Math.abs(worstScenario.monthlyPayment - bestScenario.monthlyPayment))],
            ['Total Interest', ...results.scenarios.map(s => formatCurrency(s.totalInterest)), formatCurrency(Math.abs(worstScenario.totalInterest - bestScenario.totalInterest))],
            ['Total Cost of Loan', ...results.scenarios.map(s => formatCurrency(s.totalPayment)), formatCurrency(Math.abs(worstScenario.totalPayment - bestScenario.totalPayment))]
        ];

        doc.autoTable({
            startY: yPos,
            head: summaryHead,
            body: summaryBody,
            headStyles: { fillColor: [63, 81, 181] },
            styles: { font: 'helvetica', fontSize: 10 },
            margin: { left: leftMargin, right: leftMargin }
        });
        yPos = (doc as any).lastAutoTable.finalY;
    } else {
         const scenario = results.scenarios[0];
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(16);
         doc.text(`Loan Overview: "${scenario.scenarioName}"`, leftMargin, yPos);
         yPos += 10;
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(11);
         const overviewText = "Based on your loan details, here is your projected repayment summary:";
         doc.text(overviewText, leftMargin, yPos, {maxWidth: contentWidth});
         yPos += 15;
         
         const summaryBody = [
             ['Monthly Payment', formatCurrency(scenario.monthlyPayment)],
             ['Total Interest', formatCurrency(scenario.totalInterest)],
             ['Total Cost of Loan', formatCurrency(scenario.totalPayment)],
         ];

         doc.autoTable({
             startY: yPos,
             body: summaryBody,
             theme: 'plain',
             styles: { font: 'helvetica', fontSize: 11, cellPadding: 3 },
             columnStyles: { 0: { fontStyle: 'bold' } },
             margin: { left: leftMargin, right: leftMargin }
         });
         yPos = (doc as any).lastAutoTable.finalY;
    }

    // --- Page 3: Amortization Schedule ---
    results.scenarios.forEach((scenario) => {
        doc.addPage();
        addHeader('Amortization Schedule');
        
        const schedule = scenario.amortizationSchedule;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`Schedule for: ${scenario.scenarioName}`, leftMargin, yPos);
        yPos += 10;

        const head = [['Month', 'Principal', 'Interest', 'Balance']];
        let body = [];

        if (schedule.length <= 24) {
          body = schedule.map(row => [row.month, formatCurrency(row.principal), formatCurrency(row.interest), formatCurrency(row.remainingBalance)]);
        } else {
          const first12 = schedule.slice(0, 12).map(row => [row.month, formatCurrency(row.principal), formatCurrency(row.interest), formatCurrency(row.remainingBalance)]);
          const last12 = schedule.slice(-12).map(row => [row.month, formatCurrency(row.principal), formatCurrency(row.interest), formatCurrency(row.remainingBalance)]);
          const separator = [['...', '...', '...', '...']];
          body = [...first12, ...separator, ...last12];
        }
        
        doc.autoTable({
            head,
            body,
            startY: yPos,
            headStyles: { fillColor: [63, 81, 181] },
            margin: { left: leftMargin, right: leftMargin }
        });
        const finalY = (doc as any).lastAutoTable.finalY + 5;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("A full amortization schedule is available in the accompanying CSV file.", leftMargin, finalY);
        yPos = 0; // Reset yPos for next scenario if any
    });

    // --- Final Page: Next Steps & Upsell ---
    doc.addPage();
    addHeader("Understanding Your Loan & Next Steps");

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("How to Use This Information", leftMargin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const bulletsYStart = yPos;
    doc.text("•", leftMargin + 4, bulletsYStart + 1);
    doc.text("Use this report to negotiate with your lender.", leftMargin + 10, bulletsYStart + 1, {maxWidth: contentWidth - 10});
    yPos += 8;
    doc.text("•", leftMargin + 4, yPos + 1);
    doc.text("Consider the monthly payment impact on your budget.", leftMargin + 10, yPos + 1, {maxWidth: contentWidth - 10});
    yPos += 8;
    doc.text("•", leftMargin + 4, yPos + 1);
    doc.text("Remember to account for any upfront fees not included in this analysis.", leftMargin + 10, yPos + 1, {maxWidth: contentWidth - 10});
    yPos += 20;

    doc.setDrawColor(226, 232, 240); // border color
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Track Your Actual Loan and Maximize Savings", pageWidth / 2, yPos, {align: 'center'});
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const nextStepsText = "Your loan journey doesn't end at signing. Use your exclusive code below to try LoanZen Tracker Pro free for 14 days. Add your real loan details to get reminders before payments are due, see the impact of making extra payments, and track your progress to becoming debt-free.";
    doc.text(nextStepsText, pageWidth / 2, yPos, {maxWidth: contentWidth - 20, align: 'center'});
    yPos += 30;
    
    const boxX = (pageWidth - 90) / 2;
    doc.setFillColor(245, 245, 245); // Light Gray background
    doc.setDrawColor(226, 232, 240); // border color
    doc.roundedRect(boxX, yPos, 90, 20, 3, 3, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(18);
    doc.text(couponCode, pageWidth / 2, yPos + 12.5, { align: 'center' });

    addFooter();
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
}


// --- CSV Generation ---
function generateCsvReport(results: CalculationResults): string {
    const headers = [
        'Scenario Name',
        'Month',
        'Monthly Payment',
        'Principal',
        'Interest',
        'Remaining Balance'
    ];

    const rows = results.scenarios.flatMap(scenario =>
        scenario.amortizationSchedule.map(row => [
            `"${scenario.scenarioName.replace(/"/g, '""')}"`,
            row.month,
            row.monthlyPayment.toFixed(2),
            row.principal.toFixed(2),
            row.interest.toFixed(2),
            row.remainingBalance.toFixed(2)
        ].join(','))
    );

    return [headers.join(','), ...rows].join('\n');
}


async function handleStripeWebhook(event: Stripe.Event) {
    if (event.type !== 'checkout.session.completed') {
        return;
    }
    const session = event.data.object as Stripe.Checkout.Session;
    
    if (session.payment_status === 'paid') {
      const formDataString = session.metadata?.formData;
      if (!formDataString) {
          console.error("Webhook Error: No form data found in session metadata.");
          return;
      }

      const formData: CalculatorFormData = JSON.parse(formDataString);
      const userEmail = session.customer_details?.email;

      if (!userEmail) {
           console.error("Webhook Error: No user email found in session.");
           return;
      }
      
      const results = performCalculations(formData);
      const pdfBuffer = generateReportPdf(results, userEmail);
      const csvContent = generateCsvReport(results);
      
      // --- SIMULATION ---
      // In a real application, you would do the following:
      // 1. Upload the PDF and CSV to Firebase Storage
      // const storageRefPdf = ref(storage, `reports/${session.id}.pdf`);
      // await uploadBytes(storageRefPdf, pdfBuffer);
      // const downloadUrlPdf = await getDownloadURL(storageRefPdf);
      // const storageRefCsv = ref(storage, `reports/${session.id}.csv`);
      // await uploadString(storageRefCsv, csvContent, 'raw');
      // const downloadUrlCsv = await getDownloadURL(storageRefCsv);
      console.log(`--- SIMULATING REPORT UPLOAD ---`);
      console.log(`Session ID: ${session.id}`);
      console.log(`Reports generated for: ${userEmail}`);
      console.log(`PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
      console.log(`CSV Content size: ${csvContent.length} chars`);


      // 2. Save download URLs to Firestore
      // await setDoc(doc(db, "reports", session.id), {
      //   userId: userEmail,
      //   downloadUrlPdf: downloadUrlPdf,
      //   downloadUrlCsv: downloadUrlCsv,
      //   generatedAt: serverTimestamp(),
      //   status: 'completed'
      // });
      console.log(`--- SIMULATING FIRESTORE WRITE ---`);
      console.log(`Saving report details for session: ${session.id}`);

      // 3. Send the email with the download links
      // await resend.emails.send({
      //   from: 'LoanZen <reports@loanzen.com>',
      //   to: [userEmail],
      //   subject: 'Your LoanZen Report is Ready!',
      //   html: `<h1>Thank You!</h1><p>Your report is ready. <a href="${downloadUrlPdf}">Click here to download PDF</a> or <a href="${downloadUrlCsv}">download the CSV</a>.</p>`,
      // });
      console.log(`--- SIMULATING EMAIL SEND ---`);
      console.log(`Sending email to ${userEmail} with report links.`);
    }
}

// This GET handler is a workaround for the demo to allow downloading the report.
// In production, the "Thank You" page would get the download URL from Firestore
// after the webhook has successfully processed the payment and uploaded the file.
async function handleGetRequest(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const shouldDownload = req.nextUrl.searchParams.get('download');
    const format = req.nextUrl.searchParams.get('format') || 'pdf'; // Default to pdf

    if (!sessionId || !shouldDownload) {
        return NextResponse.json({ error: 'Missing session_id or download parameter' }, { status: 400 });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const formDataString = session.metadata?.formData;
        const userEmail = session.customer_details?.email;

        if (!formDataString) {
            return NextResponse.json({ error: 'Form data not found in session.' }, { status: 404 });
        }
        
        if (!userEmail) {
            return NextResponse.json({ error: 'User email not found in session.' }, { status: 404 });
        }

        const formData: CalculatorFormData = JSON.parse(formDataString);
        const results = performCalculations(formData);

        if (format === 'csv') {
            const csvContent = generateCsvReport(results);
            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="LoanZen-Report.csv"',
                },
            });
        }

        // Default to PDF
        const pdfBuffer = generateReportPdf(results, userEmail);
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="LoanZen-Report.pdf"',
            },
        });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to retrieve session or generate report: ${errorMessage}`);
        return NextResponse.json({ error: `Failed to generate report: ${errorMessage}` }, { status: 500 });
    }
}


export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret is not configured.' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  try {
    await handleStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (err) {
     const errorMessage = err instanceof Error ? err.message : 'Unknown error';
     console.error(`Webhook handler failed: ${errorMessage}`);
     return NextResponse.json({ error: `Webhook handler error: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    try {
        return await handleGetRequest(req);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`GET request handler failed: ${errorMessage}`);
        return NextResponse.json({ error: `An unexpected error occurred: ${errorMessage}` }, { status: 500 });
    }
}
