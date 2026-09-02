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

    const userId = rawPhone || rawEmail;
    const email = rawEmail || `customer.${rawPhone.slice(-6)}@fatafat.com`;
    const phone = rawPhone || '9876543210';
    const name = rawName || (rawEmail ? rawEmail.split('@')[0] : `Customer ${phone.slice(-4)}`);

    // Ensure user record exists in database
    try {
      const users = await db.readTable<any>('users') || [];
      const existingUser = users.find((u: any) => 
        (u.email && u.email.toLowerCase() === email) || 
        (u.phone && String(u.phone).replace(/\D/g, '') === rawPhone) ||
        (u.userId && u.userId === userId)
      );

      if (!existingUser) {
        const now = new Date().toISOString();
        const newUser = {
          userId,
          name,
          email,
          phone,
          role: 'customer',
          createdAt: now,
          lastLoginAt: now,
          wellnessAccessStatus: 'NOT_REQUESTED',
          addresses: []
        };
        users.push(newUser);
        await db.writeTable('users', users);
      }
    } catch (dbErr) {
      console.warn('Customer user persistence warning:', dbErr);
    }

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
