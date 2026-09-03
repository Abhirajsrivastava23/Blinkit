import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    // 1. Fetch fresh state from database
    const rawPayments = await db.readTable<any>('payment_transactions') || [];
    const orders = await db.readTable<any>('orders') || [];
    const users = await db.readTable<any>('users') || [];

    const userMap = new Map<string, any>();
    for (const user of users) {
      if (user.userId) userMap.set(String(user.userId).toLowerCase(), user);
      if (user.email) userMap.set(String(user.email).toLowerCase(), user);
    }

    const orderMap = new Map<string, any>();
    for (const order of orders) {
      if (order.id) orderMap.set(String(order.id).toLowerCase(), order);
    }

    const paymentMap = new Map<string, any>();
    for (const payment of rawPayments) {
      if (payment.orderId) paymentMap.set(String(payment.orderId).toLowerCase(), payment);
    }

    const allOrderKeys = new Set<string>();
    for (const o of orders) if (o.id) allOrderKeys.add(String(o.id).toLowerCase());
    for (const p of rawPayments) if (p.orderId) allOrderKeys.add(String(p.orderId).toLowerCase());

    const rows: any[] = [];

    for (const orderKey of allOrderKeys) {
      const order = orderMap.get(orderKey) || null;
      const payment = paymentMap.get(orderKey) || null;

      const user = userMap.get(String(order?.customerId || payment?.customerId || order?.customerEmail || '').toLowerCase()) || null;
      const orderAddr = (order?.address && typeof order.address === 'object') ? order.address : {};

      const orderPayStatus = String(order?.paymentStatus || '').toUpperCase();
      const txStatus = String(payment?.status || '').toUpperCase();

      // Determine authoritative canonical status:
      let canonicalStatus = 'PENDING';
      if (
        orderPayStatus === 'PAID' || 
        txStatus === 'PAID' || 
        order?.status === 'Confirmed' || 
        order?.status === 'Preparing' || 
        order?.status === 'Packed' || 
        order?.status === 'Out for Delivery' || 
        order?.status === 'Delivered'
      ) {
        canonicalStatus = 'PAID';
      } else if (orderPayStatus === 'REJECTED' || txStatus === 'REJECTED') {
        canonicalStatus = 'REJECTED';
      } else if (
        orderPayStatus === 'PAYMENT_VERIFICATION_PENDING' || 
        txStatus === 'PAYMENT_VERIFICATION_PENDING' || 
        order?.utr || 
        payment?.utr || 
        order?.proofImageUrl || 
        payment?.proofImageUrl
      ) {
        canonicalStatus = 'PAYMENT_VERIFICATION_PENDING';
      } else if (orderPayStatus) {
        canonicalStatus = orderPayStatus;
      }

      const utr = payment?.utr || order?.utr || '';
      const proofImageUrl = payment?.proofImageUrl || order?.proofImageUrl || '';
      const submittedAt = payment?.submittedAt || order?.paymentSubmittedAt || payment?.createdAt || order?.createdAt || new Date().toISOString();

      const itemsList = Array.isArray(order?.items) ? order.items : [];
      const sanitizedItems = itemsList.map((item: any) => ({
        productId: item.productId || item.id || '',
        name: item.name || 'Product',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        image: item.image || item.imageUrl || '',
        unit: item.unit || '',
      }));

      rows.push({
        id: payment?.id || `pay-${order?.id || orderKey}`,
        orderId: order?.id || payment?.orderId || orderKey,
        customerId: order?.customerId || payment?.customerId || 'customer',
        customerName: orderAddr.name || user?.name || (order?.customerEmail ? order.customerEmail.split('@')[0] : 'Customer'),
        customerEmail: order?.customerEmail || user?.email || payment?.customerId || '',
        customerPhone: orderAddr.mobile || orderAddr.phone || user?.phone || '',
        amount: Number(order?.total || payment?.amount || 0),
        subtotal: Number(order?.subtotal || 0),
        deliveryFee: Number(order?.deliveryFee || 0),
        discount: Number(order?.discount || 0),
        status: canonicalStatus,
        orderStatus: order?.status || (canonicalStatus === 'PAID' ? 'Confirmed' : 'Pending'),
        utr: utr,
        proofImageUrl: proofImageUrl,
        submittedAt: submittedAt,
        orderCreatedAt: order?.createdAt || payment?.createdAt,
        verifiedAt: payment?.verifiedAt || order?.paymentVerifiedAt,
        verifiedBy: payment?.verifiedBy,
        rejectedAt: payment?.rejectedAt || order?.paymentRejectedAt,
        rejectedBy: payment?.rejectedBy,
        rejectionReason: payment?.rejectionReason || order?.rejectionReason,
        itemsCount: itemsList.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0),
        items: sanitizedItems,
        deliveryLocationName: order?.deliveryLocationName || 'Nawabganj, Unnao',
        deliveryOption: order?.deliveryOption || 'ASAP',
        updatedAt: payment?.updatedAt || order?.updatedAt || submittedAt
      });
    }

    rows.sort((a: any, b: any) => {
      const timeA = new Date(a.submittedAt || a.updatedAt || a.orderCreatedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.updatedAt || b.orderCreatedAt || 0).getTime();
      return timeB - timeA;
    });

    const resHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    if (session.role === 'customer') {
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();
      const filtered = rows.filter((row) => String(row.customerId).toLowerCase() === sId || String(row.customerEmail).toLowerCase() === sEmail);
      return NextResponse.json(filtered, { headers: resHeaders });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: resHeaders });
    }

    return NextResponse.json(rows, { headers: resHeaders });
  } catch (error) {
    console.error('List payment submissions error:', error);
    return NextResponse.json({ error: 'Failed to retrieve payment submissions.' }, { status: 500 });
  }
}


