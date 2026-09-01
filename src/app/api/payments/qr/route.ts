import { NextResponse } from 'next/server';
import { db } from '@/data/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!orderId || !amount) {
      return NextResponse.json({ error: 'Order ID and amount are required.' }, { status: 400 });
    }

    const configRes = await db.query("SELECT data FROM config WHERE key = 'payment_settings'");
    const config = (configRes.rows[0]?.data || { upiId: '8081988627@pthdfc', merchantName: 'FATAFAT' }) as {
      upiId?: string;
      merchantName?: string;
    };
    const upiId = String(config.upiId || '8081988627@pthdfc');
    const merchantName = String(config.merchantName || 'FATAFAT');
    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: 'Valid amount is required.' }, { status: 400 });
    }

    const encodedUpiId = encodeURIComponent(upiId);
    const encodedName = encodeURIComponent(merchantName);
    const encodedAmount = encodeURIComponent((amountNumber).toFixed(2));
    const tr = encodeURIComponent(`ORDER-${orderId}`);
    const uri = `upi://pay?pa=${encodedUpiId}&pn=${encodedName}&am=${encodedAmount}&cu=INR&tr=${tr}`;

    return NextResponse.json({
      success: true,
      upiId,
      amount: Number(amountNumber.toFixed(2)),
      uri,
      merchantName,
      note: 'This QR only initiates UPI payment. Actual confirmation remains manual through UTR and admin verification.'
    });
  } catch (error) {
    console.error('Payment QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate payment QR.' }, { status: 500 });
  }
}
