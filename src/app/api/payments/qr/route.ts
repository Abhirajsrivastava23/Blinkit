import { NextResponse } from 'next/server';
import { db } from '@/data/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const paramAmount = searchParams.get('amount');

    if (!orderId && !paramAmount) {
      return NextResponse.json({ error: 'Order ID or amount is required.' }, { status: 400 });
    }

    let amountNumber = Number(paramAmount);

    if (orderId) {
      let order: any = null;
      try {
        const orderQuery = await db.query<any>('SELECT total FROM orders WHERE id = $1 LIMIT 1', [orderId]);
        if (orderQuery.rows.length > 0 && orderQuery.rows[0].total) {
          order = orderQuery.rows[0];
        }
      } catch (e) {
        console.warn('QR order lookup query warning:', e);
      }
      if (!order) {
        const orders = await db.readTable<any>('orders') || [];
        order = orders.find((o: any) => o.id === orderId);
      }
      if (order && order.total) {
        amountNumber = Number(order.total);
      }
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required.' }, { status: 400 });
    }

    const upiId = '8081988627@pthdfc';
    const merchantName = 'FATAFAT';
    const formattedAmount = amountNumber.toFixed(2);
    const orderRef = orderId || `FT${Date.now()}`;
    const uri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tr=${encodeURIComponent(orderRef)}`;

    return NextResponse.json({
      success: true,
      upiId,
      amount: Number(formattedAmount),
      uri,
      merchantName,
      orderId: orderRef,
      note: 'Scan using any UPI app (GPay, PhonePe, Paytm, BHIM) and pay the exact amount.'
    });
  } catch (error) {
    console.error('Payment QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate payment QR.' }, { status: 500 });
  }
}
