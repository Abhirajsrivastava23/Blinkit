import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'customer' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized: Customer session required.' }, { status: 401 });
    }

    const body = await request.json() as {
      orderId?: string;
      paymentId?: string;
      amount?: number;
      utr?: string;
      proofImageUrl?: string;
    };

    const { orderId, paymentId, utr, proofImageUrl } = body;

    if (!orderId || !utr || !proofImageUrl) {
      return NextResponse.json({ error: 'Order ID, UTR, and payment proof image are required.' }, { status: 400 });
    }

    const cleanOrderId = decodeURIComponent(String(orderId) || '').trim();
    const trimmedUtr = String(utr).trim();
    if (!trimmedUtr) {
      return NextResponse.json({ error: 'UTR is required.' }, { status: 400 });
    }

    // 1. Fetch order reliably with case-insensitive search
    const order = await db.getOrderById(cleanOrderId);

    if (!order) {
      console.warn(`[PAYMENT SUBMIT] Order genuinely not found for ID: "${cleanOrderId}"`);
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // 2. Authorization check
    const orderCustomer = String(order.customerId || '').toLowerCase().trim();
    const orderEmail = String(order.customerEmail || '').toLowerCase().trim();
    const sId = String(session.userId || '').toLowerCase().trim();
    const sEmail = String(session.email || '').toLowerCase().trim();
    const orderAddr = (order.address && typeof order.address === 'object') ? order.address as Record<string, unknown> : {};
    const addrPhone = String(orderAddr.mobile || '').replace(/\D/g, '');
    const sPhone = sId.replace(/\D/g, '');

    const isAuthorized = (
      session.role === 'admin' ||
      !orderCustomer ||
      orderCustomer === sId ||
      orderCustomer === sEmail ||
      (orderEmail && sEmail && orderEmail === sEmail) ||
      (addrPhone && sPhone && addrPhone === sPhone) ||
      (addrPhone && sId.includes(addrPhone))
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: 'You are not authorized to submit payment for this order.' }, { status: 403 });
    }

    const serverTotal = Number(order.total || 0);
    const now = new Date().toISOString();

    // 3. Update or Insert payment transaction
    let payment = await db.getPaymentByOrderId(String(order.id));
    if (!payment && paymentId) {
      payment = await db.getPaymentById(paymentId);
    }

    if (payment) {
      try {
        await db.query(
          `UPDATE payment_transactions
           SET utr = $1,
               "proofImageUrl" = $2,
               status = $3,
               "submittedAt" = $4,
               "updatedAt" = $5,
               "paymentProofType" = $6,
               metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb
           WHERE LOWER(id) = LOWER($8)`,
          [
            trimmedUtr,
            proofImageUrl,
            'PAYMENT_VERIFICATION_PENDING',
            now,
            now,
            'image',
            JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
            payment.id,
          ]
        );
      } catch (payUpErr) {
        console.warn('payment_transactions update warning:', payUpErr);
      }
    } else {
      const newPayId = paymentId || `pay-${order.id}-${Date.now()}`;
      try {
        await db.query(
          `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, utr, "proofImageUrl", "submittedAt", "createdAt", "updatedAt", "attemptCount", metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT ("orderId") DO UPDATE
           SET utr = $9, "proofImageUrl" = $10, "submittedAt" = $11, status = $6, "updatedAt" = $13`,
          [
            newPayId,
            order.id,
            session.userId || order.customerId,
            serverTotal,
            'INR',
            'PAYMENT_VERIFICATION_PENDING',
            'UPI',
            'MANUAL_UPI',
            trimmedUtr,
            proofImageUrl,
            now,
            now,
            now,
            1,
            JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
          ]
        );
      } catch (payInsErr) {
        console.warn('payment_transactions insert warning:', payInsErr);
      }
    }

    // 4. Update order payment status in database reliably
    const updatedOrder = await db.updateOrder(cleanOrderId, {
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      utr: trimmedUtr,
      proofImageUrl,
      paymentSubmittedAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully. Your payment is under review by our team.',
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      order: updatedOrder,
      orderId: order.id,
      utr: trimmedUtr,
      proofImageUrl,
    });
  } catch (error) {
    console.error('Manual UPI proof submission error:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof.' }, { status: 500 });
  }
}


