
// src/app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { FormData as CalculatorFormData } from '@/app/calculator/form';

// Extend the jsPDF type to include the autoTable method
interface jsPDFWithAutoTable extends jsPDF {
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

function generateReportPdf(results: CalculationResults): Buffer {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const couponCode = generateCouponCode();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('LoanZen - Amortization Report', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text(`Loan Name: ${results.loanName}`, 14, 35);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Loan Type: ${results.loanType}`, 14, 42);
    doc.text(`Interest Rate Type: ${results.interestRateType}`, 14, 49);

    let yPos = 60;

    results.scenarios.forEach((scenario, index) => {
        if (index > 0) {
            yPos += 10;
        }

        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`Scenario: ${scenario.scenarioName}`, 14, yPos);
        yPos += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Monthly Payment: $${scenario.monthlyPayment.toFixed(2)}`, 14, yPos);
        doc.text(`Total Interest: $${scenario.totalInterest.toFixed(2)}`, 80, yPos);
        doc.text(`Total Cost: $${scenario.totalPayment.toFixed(2)}`, 140, yPos);
        yPos += 8;

        const head = [['Month', 'Principal', 'Interest', 'Balance']];
        const body = scenario.amortizationSchedule.map((row: AmortizationData) => [
            row.month,
            `$${row.principal.toFixed(2)}`,
            `$${row.interest.toFixed(2)}`,
            `$${row.remainingBalance.toFixed(2)}`
        ]);

        doc.autoTable({
            head,
            body,
            startY: yPos,
            headStyles: { fillColor: [63, 81, 181] }, // #3F51B5
            margin: { left: 14, right: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY;
    });
    
    // Add coupon code
    yPos += 15;
     if (yPos > 260) {
        doc.addPage();
        yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Your Premium Bonus!', 105, yPos, {align: 'center'});
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Thank you for your purchase. As a bonus, here is a coupon for one free month of our Tracker Pro service:', 105, yPos, { align: 'center', maxWidth: 180 });
    yPos += 12;

    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    doc.text(couponCode, 105, yPos, { align: 'center' });
    
    // The key change: return the PDF as a Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
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
      const pdfBuffer = generateReportPdf(results);
      
      // --- SIMULATION ---
      // In a real application, you would do the following:
      // 1. Upload the PDF to Firebase Storage
      // const storageRef = ref(storage, `reports/${session.id}.pdf`);
      // const uploadResult = await uploadBytes(storageRef, pdfBuffer);
      // const downloadUrl = await getDownloadURL(uploadResult.ref);
      console.log(`--- SIMULATING PDF UPLOAD ---`);
      console.log(`Session ID: ${session.id}`);
      console.log(`PDF generated for: ${userEmail}`);
      console.log(`PDF Buffer size: ${pdfBuffer.byteLength} bytes`);

      // 2. Save download URL to Firestore
      // await setDoc(doc(db, "reports", session.id), {
      //   userId: userEmail,
      //   downloadUrl: downloadUrl,
      //   generatedAt: serverTimestamp(),
      //   status: 'completed'
      // });
      console.log(`--- SIMULATING FIRESTORE WRITE ---`);
      console.log(`Saving report details for session: ${session.id}`);

      // 3. Send the email with the download link
      // await resend.emails.send({
      //   from: 'LoanZen <reports@loanzen.com>',
      //   to: [userEmail],
      //   subject: 'Your LoanZen Report is Ready!',
      //   html: `<h1>Thank You!</h1><p>Your report is ready. <a href="${downloadUrl}">Click here to download</a>.</p>`,
      // });
      console.log(`--- SIMULATING EMAIL SEND ---`);
      console.log(`Sending email to ${userEmail} with the report link.`);
    }
}

// This GET handler is a workaround for the demo to allow downloading the report.
// In production, the "Thank You" page would get the download URL from Firestore
// after the webhook has successfully processed the payment and uploaded the file.
async function handleGetRequest(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const shouldDownload = req.nextUrl.searchParams.get('download');

    if (!sessionId || !shouldDownload) {
        return NextResponse.json({ error: 'Missing session_id or download parameter' }, { status: 400 });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const formDataString = session.metadata?.formData;

        if (!formDataString) {
            return NextResponse.json({ error: 'Form data not found in session.' }, { status: 404 });
        }

        const formData: CalculatorFormData = JSON.parse(formDataString);
        const results = performCalculations(formData);
        const pdfBuffer = generateReportPdf(results);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="LoanZen-Report.pdf"',
            },
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to retrieve session or generate PDF: ${errorMessage}`);
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
