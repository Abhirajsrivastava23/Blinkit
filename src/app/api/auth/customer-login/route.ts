import { NextResponse } from 'next/server';
import { createSession } from '../../../../data/auth';
import { db } from '../../../../data/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = String(body.email || '').trim().toLowerCase();
    const rawPhone = String(body.phone || '').replace(/\D/g, '');
    const rawName = String(body.name || '').trim();

    if (!rawEmail && !rawPhone) {
      return NextResponse.json({ error: 'Valid phone number or email address is required.' }, { status: 400 });
    }

    const cleanPhone = rawPhone || '';
    const cleanEmail = rawEmail || (cleanPhone ? `customer.${cleanPhone.slice(-6)}@fatafat.com` : '');
    const defaultName = rawName || (rawEmail ? rawEmail.split('@')[0] : `Customer ${cleanPhone.slice(-4)}`);

    // Check existing customer to avoid duplicates and preserve order relationships
    const existingUser = await db.getUserById(cleanPhone || cleanEmail);
    const userId = existingUser?.userId ? String(existingUser.userId) : (cleanPhone || cleanEmail);
    const email = cleanEmail || String(existingUser?.email || '');
    const phone = cleanPhone || String(existingUser?.phone || '');
    const name = rawName || String(existingUser?.name || defaultName);

    const savedUser = await db.upsertUser({
      ...existingUser,
      userId,
      name,
      email,
      phone,
      role: 'customer'
    });

    // Create authentic customer session
    const session = await createSession(userId, email, 'customer');

    const response = NextResponse.json({
      success: true,
      user: {
        userId,
        name,
        email,
        phone,
        role: 'customer'
      }
    });

    response.cookies.set('fatafat_session_token', session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (err) {
    console.error('Error in customer-login:', err);
    return NextResponse.json({ error: 'Server error processing customer authentication.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed. Use POST for authentication.' }, { status: 405 });
}
