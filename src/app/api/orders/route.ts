import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { getSession } from '../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const list = await db.readTable<any>('orders') || [];
    const payments = await db.readTable<any>('payment_transactions') || [];
    const paymentMap = new Map<string, any>();
    for (const p of payments) {
      if (p.orderId) {
        paymentMap.set(String(p.orderId), p);
      }
    }

    const enrichedList = list.map((o: any) => {
      const p = paymentMap.get(String(o.id));
      if (p) {
        return {
          ...o,
          paymentStatus: p.status || o.paymentStatus,
          utr: p.utr || o.utr,
          proofImageUrl: p.proofImageUrl || o.proofImageUrl,
          paymentSubmittedAt: p.submittedAt || o.paymentSubmittedAt,
          paymentVerifiedAt: p.verifiedAt || o.paymentVerifiedAt,
          paymentRejectedAt: p.rejectedAt || o.paymentRejectedAt,
          rejectionReason: p.rejectionReason || o.rejectionReason,
        };
      }
      return o;
    });

    if (session.role === 'admin') {
      return NextResponse.json(enrichedList);
    }

    if (session.role === 'delivery_partner') {
      // Filter orders assigned to this partner and strip deliveryOtp
      const cleanPartnerId = String(session.userId || '').toLowerCase().trim();
      const cleanPartnerEmail = String(session.email || '').toLowerCase().trim();
      const filtered = enrichedList.filter((o: any) => {
        const aId = String(o.assignedPartnerId || '').toLowerCase().trim();
        return aId && (aId === cleanPartnerId || aId === cleanPartnerEmail);
      });
      const sanitized = filtered.map((o: any) => {
        const { deliveryOtp, ...rest } = o;
        return rest;
      });
      return NextResponse.json(sanitized);
    }

    if (session.role === 'customer') {
      // Filter orders owned by this customer and mask deliveryOtp if not Out for Delivery or Delivered
      const filtered = enrichedList.filter((o: any) => {
        const cId = o.customerId ? String(o.customerId).toLowerCase() : '';
        const cEmail = o.customerEmail ? String(o.customerEmail).toLowerCase() : '';
        const sId = session.userId ? String(session.userId).toLowerCase() : '';
        const sEmail = session.email ? String(session.email).toLowerCase() : '';
        return (cId === sId || cId === sEmail || cEmail === sEmail || cEmail === sId);
      });
      const sanitized = filtered.map((o: any) => {
        const otpActive = o.deliveryOtp && o.otpExpiresAt && new Date(o.otpExpiresAt) > new Date();
        if (o.status !== 'Out for Delivery' && o.status !== 'Delivered' && !otpActive) {
          return { ...o, deliveryOtp: '******' };
        }
        return o;
      });
      return NextResponse.json(sanitized);
    }

    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  } catch (err) {
    console.error('Error reading orders list:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Customer sign in required to place orders.' }, { status: 401 });
    }

    const body = await request.json();
    const orders = await db.readTable<any>('orders') || [];
    
    // Check if updating an existing order
    const idx = orders.findIndex((o: any) => o.id === body.id);
    if (idx > -1 && body.id) {
      const prevStatus = orders[idx].status;
      const newStatus = body.status;
      
      // Update history if status changes
      if (newStatus && newStatus !== prevStatus) {
        if (!body.statusHistory) {
          body.statusHistory = orders[idx].statusHistory || [];
        }
        body.statusHistory.push({
          previousStatus: prevStatus,
          newStatus,
          changedByUserId: session.userId || session.email || 'customer',
          changedByRole: session.role,
          timestamp: new Date().toISOString()
        });
      }
      
      orders[idx] = {
        ...orders[idx],
        ...body
      };

      await db.writeTable('orders', orders);
      return NextResponse.json({ success: true, order: orders[idx], orderId: orders[idx].id });
    } else {
      // 1. New Order Creation must require a customer session
      if (session.role !== 'customer' && session.role !== 'admin') {
        return NextResponse.json({ error: 'Only customers can place orders.' }, { status: 403 });
      }

      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
      }

      if (!body.address || !body.address.street || !body.address.city) {
        return NextResponse.json({ error: 'Valid delivery address is required.' }, { status: 400 });
      }

      // Check if order contains wellness items
      const hasWellnessItem = body.items.some((item: any) => item.category === 'wellness');
      if (hasWellnessItem) {
        const configRes = await db.query("SELECT data FROM config WHERE key = 'wellness_settings'");
        const wellnessPublished = (configRes.rows[0]?.data as any)?.published ?? false;

        if (!wellnessPublished) {
          return NextResponse.json({ error: 'Checkout blocked: Wellness storefront is currently unpublished.' }, { status: 403 });
        }

        const users = await db.readTable<any>('users') || [];
        const userObj = users.find((u: any) => u.userId === session.userId || u.email === session.email);

        if (!userObj) {
          return NextResponse.json({ error: 'Checkout blocked: Customer profile record not found.' }, { status: 403 });
        }

        if (userObj.wellnessAccessStatus !== 'APPROVED' && userObj.wellnessAccessStatus !== 'ACTIVE') {
          return NextResponse.json({ error: 'Checkout blocked: Approved Wellness profile required.' }, { status: 403 });
        }
      }

      // 2. Server-side calculations & ID generation
      const orderId = body.id || `FT${Math.floor(100000 + Math.random() * 900000)}`;
      
      let calculatedSubtotal = 0;
      for (const item of body.items) {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        calculatedSubtotal += price * qty;
      }

      const deliveryFee = calculatedSubtotal >= 799 ? 0 : 49;
      const discount = Number(body.discount) || 0;
      const grandTotal = Math.max(0, calculatedSubtotal + deliveryFee - discount);

      const now = new Date().toISOString();

      const newOrder = {
        id: orderId,
        customerId: session.userId,
        customerEmail: session.email,
        items: body.items,
        subtotal: calculatedSubtotal,
        deliveryFee,
        discount,
        total: grandTotal,
        address: body.address,
        status: 'Pending',
        paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
        paymentMethod: 'UPI',
        deliveryOption: body.deliveryOption || 'ASAP',
        deliveryTimeSlot: body.deliveryOption === 'Scheduled' ? body.deliveryTimeSlot : undefined,
        scheduledDeliveryAt: body.scheduledDeliveryAt || undefined,
        eta: '35 mins',
        createdAt: now,
        deliveryLocationId: body.deliveryLocationId || 'nawabganj-unnao',
        deliveryLocationName: body.deliveryLocationName || 'Nawabganj, Unnao',
        deliveryOtp: null,
        otpFailedAttempts: 0,
        otpExpiresAt: null,
        statusHistory: [{
          previousStatus: null,
          newStatus: 'Pending',
          changedByUserId: session.userId,
          changedByRole: session.role,
          timestamp: now
        }]
      };

      const savedOrder = await db.updateOrder(orderId, newOrder);

      // 3. Create or ensure payment transaction record in database
      const paymentId = `pay-${orderId}-${Date.now()}`;
      try {
        await db.query(
          `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, "createdAt", "updatedAt", "attemptCount")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT ("orderId") DO UPDATE 
           SET amount = $4, "updatedAt" = $10`,
          [paymentId, orderId, session.userId, grandTotal, 'INR', 'NOT_STARTED', 'UPI', 'MANUAL_UPI', now, now, 0]
        );
      } catch (payErr) {
        console.warn('Non-fatal payment_transactions insert warning:', payErr);
      }

      return NextResponse.json({
        success: true,
        order: newOrder,
        orderId: newOrder.id,
        paymentId,
        total: newOrder.total
      });
    }
  } catch (err) {
    console.error('Error saving order:', err);
    return NextResponse.json({ error: 'Server error processing order creation.' }, { status: 500 });
  }
}
