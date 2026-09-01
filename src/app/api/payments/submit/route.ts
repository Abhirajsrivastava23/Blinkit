import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized: Customer session required.' }, { status: 401 });
    }

    const body = await request.json() as {
      orderId?: string;
      paymentId?: string;
      amount?: number;
      utr?: string;
      proofImageUrl?: string;
    };

    const { orderId, paymentId, amount, utr, proofImageUrl } = body;

    if (!orderId || !paymentId || !utr || !proofImageUrl) {
      return NextResponse.json({ error: 'Order ID, payment ID, UTR, and proof image are required.' }, { status: 400 });
    }

    const trimmedUtr = String(utr).trim();
    if (!trimmedUtr) {
      return NextResponse.json({ error: 'UTR is required.' }, { status: 400 });
    }

    const orderQuery = await db.query<any>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    const order = orderQuery.rows[0];
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const orderCustomer = String(order.customerId || '');
    if (orderCustomer !== session.userId && orderCustomer !== session.email) {
      return NextResponse.json({ error: 'You are not authorized to submit payment for this order.' }, { status: 403 });
    }

    const serverTotal = Number(order.total || 0);
    if (!serverTotal || Math.abs(Number(amount || 0) - serverTotal) > 0.01) {
      return NextResponse.json({ error: 'Order amount mismatch. Please refresh and try again.' }, { status: 400 });
    }

    const payment = await db.getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    if (String(payment.orderId) !== orderId) {
      return NextResponse.json({ error: 'Payment does not belong to this order.' }, { status: 400 });
    }

    if (String(payment.customerId) !== session.userId && String(payment.customerId) !== session.email) {
      return NextResponse.json({ error: 'Payment record ownership mismatch.' }, { status: 403 });
    }

    const paymentStatus = String(payment.status || '');
    if (['PAID', 'PAYMENT_VERIFICATION_PENDING', 'REJECTED'].includes(paymentStatus)) {
      return NextResponse.json({ error: 'Payment proof has already been submitted or processed for this order.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await db.query(
      `UPDATE payment_transactions
       SET utr = $1,
           "proofImageUrl" = $2,
           status = $3,
           "submittedAt" = $4,
           "updatedAt" = $5,
           "paymentProofType" = $6,
           "paymentProofSize" = $7,
           metadata = COALESCE(metadata, '{}'::jsonb) || $8::jsonb
       WHERE id = $9`,
      [
        trimmedUtr,
        proofImageUrl,
        'PAYMENT_VERIFICATION_PENDING',
        now,
        now,
        'image',
        0,
        JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
        paymentId,
      ]
    );

    await db.query(
      `UPDATE orders
       SET "paymentStatus" = $1,
           "updatedAt" = $2
       WHERE id = $3`,
      ['PAYMENT_VERIFICATION_PENDING', now, orderId]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully. Your payment is being verified by FATAFAT.',
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      orderId,
      paymentId,
      utr: trimmedUtr,
      proofImageUrl,
    });
  } catch (error) {
    console.error('Manual UPI proof submission error:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof.' }, { status: 500 });
  }
}
