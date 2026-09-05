import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/data/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Razorpay webhook secret not configured on server.' }, { status: 500 });
    }

    // 1. Verify Webhook Signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature, 'utf8');

    const isSignatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isSignatureValid) {
      console.warn('[RAZORPAY WEBHOOK ERROR] Invalid webhook signature received.');
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment?: {
          entity?: {
            id: string;
            order_id?: string;
            amount?: number;
            status?: string;
            method?: string;
            error_description?: string;
            notes?: Record<string, string>;
          };
        };
        order?: {
          entity?: {
            id: string;
            amount?: number;
            status?: string;
            notes?: Record<string, string>;
          };
        };
      };
    };

    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || '';
    const razorpayPaymentId = paymentEntity?.id || '';
    const noteOrderId = paymentEntity?.notes?.dbOrderId || orderEntity?.notes?.dbOrderId || '';

    const now = new Date().toISOString();

    // 2. Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      let targetOrder: Record<string, any> | null = null;

      if (noteOrderId) {
        targetOrder = await db.getOrderById(noteOrderId);
      }

      if (!targetOrder && razorpayOrderId) {
        const existingTx = await db.getPaymentByRazorpayOrderId(razorpayOrderId);
        if (existingTx?.orderId) {
          targetOrder = await db.getOrderById(String(existingTx.orderId));
        }
      }

      if (!targetOrder && razorpayOrderId) {
        const allOrders = await db.readTable<any>('orders').catch(() => []);
        targetOrder = allOrders.find((o: any) => o.razorpayOrderId === razorpayOrderId) || null;
      }

      if (targetOrder) {
        const orderId = String(targetOrder.id).replace(/^#+/, '').trim();

        // Idempotency: If already confirmed, acknowledge without double mutation
        if (targetOrder.paymentStatus === 'PAID' && targetOrder.status === 'Confirmed') {
          return NextResponse.json({ success: true, message: 'Order already confirmed and paid.' });
        }

        const hist = Array.isArray(targetOrder.statusHistory) ? [...targetOrder.statusHistory] : [];
        hist.push({
          previousStatus: String(targetOrder.status || 'Pending'),
          newStatus: 'Confirmed',
          changedByUserId: 'razorpay-webhook',
          changedByRole: 'system',
          timestamp: now,
          action: `Razorpay Webhook: ${eventType} (Payment: ${razorpayPaymentId})`
        });

        await db.updateOrder(orderId, {
          status: 'Confirmed',
          paymentStatus: 'PAID',
          paymentMethod: 'Razorpay',
          razorpayOrderId,
          razorpayPaymentId,
          paymentVerifiedAt: now,
          updatedAt: now,
          statusHistory: hist
        });

        await db.upsertPaymentTransaction({
          id: `pay-${orderId}`,
          orderId: orderId,
          customerId: String(targetOrder.customerId || targetOrder.customerEmail || 'customer'),
          amount: Number(targetOrder.total || 0),
          currency: 'INR',
          status: 'PAID',
          method: paymentEntity?.method || 'Razorpay',
          provider: 'RAZORPAY',
          transactionReference: razorpayPaymentId,
          razorpayOrderId,
          razorpayPaymentId,
          paidAt: now,
          verifiedAt: now
        });

        db.logActivity(
          'Razorpay Webhook',
          `Payment Captured via Webhook for Order #${orderId}`,
          orderId,
          String(targetOrder.paymentStatus || 'PENDING'),
          'PAID'
        );
      }
    } else if (eventType === 'payment.failed') {
      // 3. Handle payment.failed cleanly without marking the order as paid
      const failureReason = paymentEntity?.error_description || 'Payment failed on Razorpay checkout.';
      let targetOrder: Record<string, any> | null = null;

      if (noteOrderId) {
        targetOrder = await db.getOrderById(noteOrderId);
      }
      if (!targetOrder && razorpayOrderId) {
        const existingTx = await db.getPaymentByRazorpayOrderId(razorpayOrderId);
        if (existingTx?.orderId) {
          targetOrder = await db.getOrderById(String(existingTx.orderId));
        }
      }

      if (targetOrder) {
        const orderId = String(targetOrder.id).replace(/^#+/, '').trim();
        // Do not alter order if it was already confirmed
        if (targetOrder.paymentStatus !== 'PAID') {
          await db.upsertPaymentTransaction({
            id: `pay-${orderId}`,
            orderId: orderId,
            customerId: String(targetOrder.customerId || targetOrder.customerEmail || 'customer'),
            amount: Number(targetOrder.total || 0),
            currency: 'INR',
            status: 'FAILED',
            method: 'Razorpay',
            provider: 'RAZORPAY',
            transactionReference: razorpayPaymentId,
            razorpayOrderId,
            razorpayPaymentId,
            rejectionReason: failureReason
          });
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Razorpay webhook processing error:', error);
    return NextResponse.json({ error: 'Failed to process webhook event.' }, { status: 500 });
  }
}
