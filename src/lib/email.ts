import { Resend } from 'resend';
import { LOANZEN_TRIAL_COUPON_CODE } from '@/lib/coupon-code';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReportPurchaseEmail(
  to: string,
  sessionId: string,
  reportType: 'new-loan' | 'existing-loan'
) {
  // Don't send emails if API key is not configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured. Skipping email send.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reportUrl = `${appUrl}/report/${sessionId}`;
    
    const reportTypeName = reportType === 'new-loan' ? 'Loan Comparison' : 'Loan Health';
    
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'LoanZen <onboarding@resend.dev>',
      to: to,
      subject: 'Your LoanZen Report is Ready! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">LoanZen</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">Your Report is Ready! 📊</h2>
              
              <p style="font-size: 16px; color: #374151;">Thank you for your purchase! Your <strong>${reportTypeName} Report</strong> has been generated and is ready to view.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reportUrl}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                  View Your Report
                </a>
              </div>
              
              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0; font-size: 20px;">🎁 Exclusive Bonus Offer</h3>
                <p style="margin-bottom: 10px; color: #374151;">As a thank you for your purchase, here's your exclusive code for a <strong style="color: #10b981;">14-DAY FREE TRIAL</strong> of LoanZen Tracker Pro:</p>
                <div style="background: white; border: 2px dashed #3b82f6; padding: 15px; text-align: center; border-radius: 6px; margin: 15px 0;">
                  <p style="font-size: 28px; font-weight: bold; color: #1e40af; margin: 0; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                    ${LOANZEN_TRIAL_COUPON_CODE}
                  </p>
                </div>
                <p style="margin-top: 10px; margin-bottom: 0; font-size: 14px; color: #6b7280;">
                  Use this code when signing up for Tracker Pro to unlock unlimited loan tracking, payment reminders, and advanced analytics.
                </p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>💡 What's Next?</strong><br>
                  Download your report, review the insights, and use your coupon code to start tracking your loans with Tracker Pro!
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <strong>Report Details:</strong><br>
                Report ID: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${sessionId}</code><br>
                Report Type: ${reportTypeName} Report<br><br>
                If you have any questions, please don't hesitate to reach out to our support team.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} LoanZen. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">This email was sent to ${to}</p>
            </div>
          </body>
        </html>
      `,
    });
    
    console.log(`✅ Report purchase email sent to ${to} for session ${sessionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send report purchase email:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}


