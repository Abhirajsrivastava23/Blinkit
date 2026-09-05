import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
    const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    const hasWebhookSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);

    return NextResponse.json({
      provider: 'RAZORPAY',
      status: 'ACTIVE',
      keyId,
      hasKeySecret,
      hasWebhookSecret,
      currency: 'INR',
      signatureVerification: 'HMAC-SHA256 (Server-Side)',
      webhookEndpoint: '/api/payments/razorpay/webhook',
      checkoutMode: 'Standard Checkout (checkout.js)',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching payment settings:', err);
    return NextResponse.json({ error: 'Server error retrieving payment settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    // Razorpay credentials are securely managed via environment variables (.env.local)
    return NextResponse.json({
      success: true,
      message: 'Razorpay payment gateway is managed securely via environment configuration.',
      provider: 'RAZORPAY',
      status: 'ACTIVE',
      webhookEndpoint: '/api/payments/razorpay/webhook'
    });
  } catch (err) {
    console.error('Error updating payment settings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

