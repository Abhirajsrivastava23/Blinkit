import { NextResponse } from 'next/server';
import { createSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, phone, name } = await request.json();

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or Phone is required' }, { status: 400 });
    }

    // Create session for customer
    const session = await createSession(phone || email || 'guest', email || 'guest@fatafat.com', 'customer');

    const response = NextResponse.json({
      success: true,
      user: {
        name: name || 'Valued Client',
        email: email || 'guest@fatafat.com',
        phone: phone || '9876543210',
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
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
