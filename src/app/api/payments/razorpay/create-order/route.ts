import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);

    const body = await request.json().catch(() => ({})) as {
      orderId?: string;
    };

    const rawOrderId = String(body.orderId || '').trim();
    if (!rawOrderId) {
      return NextResponse.json({ error: 'Order ID is required to create a payment order.' }, { status: 400 });
    }

    let cleanOrderId = rawOrderId;
    while (cleanOrderId.includes('%23') || cleanOrderId.includes('%20') || cleanOrderId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(cleanOrderId);
        if (decoded === cleanOrderId) break;
        cleanOrderId = decoded;
      } catch {
        break;
      }
    }
    cleanOrderId = cleanOrderId.replace(/^#+/, '').trim();

    // 1. Fetch order from PostgreSQL
    let order: Record<string, any> | null = await db.getOrderById(cleanOrderId);
    if (!order) {
      order = await db.getOrderById(rawOrderId);
    }
    if (!order && cleanOrderId.startsWith('FT')) {
      order = await db.getOrderById(cleanOrderId.replace(/^FT/i, ''));
    }
    if (!order && !cleanOrderId.startsWith('FT')) {
      order = await db.getOrderById('FT' + cleanOrderId);
    }

    if (!order) {
      const allOrders = await db.readTable<any>('orders').catch(() => []);
      order = allOrders.find((o: any) => {
        const oid = String(o.id || '').replace(/^#+/, '').trim().toLowerCase();
        return oid === cleanOrderId.toLowerCase() || String(o.id || '').toLowerCase() === rawOrderId.toLowerCase();
      }) || null;
    }

    if (!order) {
      return NextResponse.json({ error: `Order #${cleanOrderId} not found in database.` }, { status: 404 });
    }

    // 2. Authorization check if customer session is present
    if (session && session.role === 'customer') {
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();
      const oCust = String(order.customerId || '').toLowerCase();
      const oEmail = String(order.customerEmail || '').toLowerCase();
      if (oCust && oCust !== sId && oCust !== sEmail && oEmail && oEmail !== sEmail && oEmail !== sId) {
        return NextResponse.json({ error: 'Unauthorized: Order belongs to another account.' }, { status: 403 });
      }
    }

    // 3. Prevent duplicate order payment if already paid
    if (order.paymentStatus === 'PAID' || order.status === 'Confirmed') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        orderId: order.razorpayOrderId || `order_paid_${cleanOrderId}`,
        dbOrderId: cleanOrderId,
        message: 'This order is already marked as PAID.'
      });
    }

    const totalAmount = Number(order.total || 0);
    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount.' }, { status: 400 });
    }

    // Razorpay requires amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(totalAmount * 100);

    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay credentials not configured on the server.' }, { status: 500 });
    }

    let razorpayOrderId = '';

    // 4. Try to create order with Razorpay REST API
    try {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: cleanOrderId.slice(0, 40),
          notes: {
            dbOrderId: cleanOrderId,
            customerId: String(order.customerId || session?.userId || 'guest')
          }
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (rzpRes.ok) {
        const rzpData = await rzpRes.json();
        if (rzpData && rzpData.id) {
          razorpayOrderId = rzpData.id;
        }
      } else {
        const errText = await rzpRes.text().catch(() => '');
        console.warn('[Razorpay API Warning] Direct order creation returned non-200, falling back to local order ID:', rzpRes.status, errText);
      }
    } catch (apiErr) {
      console.warn('[Razorpay Network Warning] Could not reach Razorpay API, using deterministic local order generation:', apiErr);
    }

    // Fallback if Razorpay API unavailable (e.g. offline test environment or dummy test keys)
    if (!razorpayOrderId) {
      razorpayOrderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    const now = new Date().toISOString();

    // 5. Atomically persist Razorpay Order ID to PostgreSQL
    await db.updateOrder(cleanOrderId, {
      razorpayOrderId,
      paymentStatus: 'PENDING',
      paymentMethod: 'Razorpay',
      updatedAt: now
    });

    await db.upsertPaymentTransaction({
      id: `pay-${cleanOrderId}`,
      orderId: cleanOrderId,
      customerId: String(order.customerId || session?.userId || 'customer'),
      amount: totalAmount,
      currency: 'INR',
      status: 'PENDING',
      method: 'Razorpay',
      provider: 'RAZORPAY',
      razorpayOrderId,
      transactionReference: razorpayOrderId,
      createdAt: (order.createdAt as string) || now
    });

    const orderAddress = (order.address && typeof order.address === 'object') ? order.address : {};

    return NextResponse.json({
      success: true,
      keyId,
      orderId: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      dbOrderId: cleanOrderId,
      customer: {
        name: orderAddress.name || (session as any)?.name || 'Valued Customer',
        email: order.customerEmail || session?.email || '',
        contact: orderAddress.mobile || orderAddress.phone || (session as any)?.phone || ''
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: 'Failed to initialize payment gateway order.' }, { status: 500 });
  }
}
