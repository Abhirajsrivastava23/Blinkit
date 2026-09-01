import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const configRes = await db.query("SELECT data FROM config WHERE key = 'payment_settings'");
    const data = configRes.rows[0]?.data || { upiId: '8081988627@pthdfc', merchantName: 'FATAFAT' };
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching payment settings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const { upiId } = await request.json();
    const normalizedUpiId = String(upiId || '8081988627@pthdfc').trim();

    if (!normalizedUpiId || !normalizedUpiId.includes('@')) {
      return NextResponse.json({ error: 'A valid UPI ID is required.' }, { status: 400 });
    }

    const configPayload = {
      upiId: normalizedUpiId,
      merchantName: 'FATAFAT',
      updatedAt: new Date().toISOString(),
      updatedBy: adminSession.email,
    };

    await db.query(
      "INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2",
      ['payment_settings', JSON.stringify(configPayload)]
    );

    return NextResponse.json({ success: true, ...configPayload });
  } catch (err) {
    console.error('Error updating payment settings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
