// src/app/api/subscription/customer-portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe secret key is not configured' },
        { status: 500 }
      );
    }

    // Verify customer exists in Stripe
    try {
      await stripe.customers.retrieve(customerId);
    } catch (customerError: any) {
      console.error('Customer not found in Stripe:', customerError);
      return NextResponse.json(
        {
          error: 'Customer not found in Stripe',
          details: customerError.message || 'The customer ID does not exist in Stripe.',
        },
        { status: 404 }
      );
    }

    // Create Stripe customer portal session
    try {
      // Optionally use a specific portal configuration ID from environment variable
      // If not set, Stripe will use the default/active configuration
      const portalConfigId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
      
      const sessionParams: any = {
        customer: customerId,
        return_url: returnUrl || `${request.headers.get('origin') || 'http://localhost:3000'}/dashboard`,
      };
      
      // Only add configuration if explicitly set
      if (portalConfigId) {
        sessionParams.configuration = portalConfigId;
      }
      
      const session = await stripe.billingPortal.sessions.create(sessionParams);

      return NextResponse.json({ url: session.url });
    } catch (portalError: any) {
      console.error('Failed to create billing portal session:', portalError);
      
      // Check if billing portal is not configured or not saved
      if (
        portalError.code === 'resource_missing' || 
        portalError.message?.includes('billing portal') ||
        portalError.message?.includes('No configuration provided') ||
        portalError.message?.includes('default configuration has not been created')
      ) {
        return NextResponse.json(
          {
            error: 'Stripe Customer Portal is not configured',
            details: 'Please save your Customer Portal configuration in Stripe Dashboard. Go to Settings → Billing → Customer portal and click "Save" to create the default configuration.',
            code: 'portal_not_configured',
            helpUrl: 'https://dashboard.stripe.com/test/settings/billing/portal',
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        {
          error: 'Failed to create customer portal session',
          details: portalError.message || 'Unknown error occurred',
          code: portalError.code,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to create customer portal session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create customer portal session',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

