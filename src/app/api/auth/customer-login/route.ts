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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get('redirect') || '/checkout';
    const email = searchParams.get('email') || 'customer@fatafat.com';
    const phone = searchParams.get('phone') || '8081988627';

    const session = await createSession(phone, email, 'customer');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
  <meta http-equiv="refresh" content="0; url=${redirectUrl}">
</head>
<body style="font-family:sans-serif;padding:2rem;text-align:center;">
  <h2>Authenticating test customer session...</h2>
  <p>Redirecting to <a href="${redirectUrl}">${redirectUrl}</a></p>
  <script>window.location.href = ${JSON.stringify(redirectUrl)};</script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

    response.cookies.set('fatafat_session_token', session.sessionId, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error('Error in GET customer-login:', err);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
