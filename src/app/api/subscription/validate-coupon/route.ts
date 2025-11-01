// src/app/api/subscription/validate-coupon/route.ts
import { NextResponse } from 'next/server';

// Valid coupon codes that grant free trial
// In production, you might want to store these in Firestore
const VALID_COUPON_CODES = [
  'TRIAL2024',
  'FREETRIAL',
  'WELCOME',
  // Add more valid coupon codes here
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { couponCode } = body;

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 });
    }

    const normalizedCode = couponCode.toUpperCase().trim();
    const isValid = VALID_COUPON_CODES.includes(normalizedCode);

    return NextResponse.json({ 
      valid: isValid,
      code: normalizedCode,
      message: isValid 
        ? 'Coupon code is valid! You will receive a free trial.' 
        : 'Invalid coupon code. Please check and try again, or proceed with payment.'
    });
  } catch (parseError) {
    console.error('Request parsing error:', parseError);
    const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse request';
    return NextResponse.json({ error: `Request error: ${errorMessage}` }, { status: 400 });
  }
}

