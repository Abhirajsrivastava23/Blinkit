import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { createSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let step = 'init';
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const callback = searchParams.get('state') || searchParams.get('callback') || '/';
    const errorParam = searchParams.get('error');

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/google-login`;

    const clientId = process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
    const authSecret = process.env['AUTH_SECRET'];

    const showDiagnostics = searchParams.get('diagnostics') === 'true';

    step = 'check-config';
    // Secure environment diagnostics check (boolean checks and partial suffix to prevent secret leakage)
    if (!clientId || !clientSecret || !authSecret || showDiagnostics) {
      console.error('Google authentication configuration check.');
      const testDb = await db.testConnection();
      return NextResponse.json({
        error: (!clientId || !clientSecret || !authSecret) ? 'Google authentication is misconfigured.' : 'Diagnostics requested.',
        diagnostics: {
          googleClientIdExists: !!clientId,
          googleClientSecretExists: !!clientSecret,
          authSecretExists: !!authSecret,
          googleClientIdLength: clientId ? clientId.length : 0,
          googleClientIdLastSix: clientId && clientId.length >= 6 ? clientId.slice(-6) : '',
          environment: process.env['NODE_ENV'] || 'unknown',
          calculatedRedirectUri: redirectUri,
          mongodbUriExists: !!(process.env.MONGODB_URI || process.env.DATABASE_URL),
          mongodbUriLength: (process.env.MONGODB_URI || process.env.DATABASE_URL || '').length,
          mongodbUriStart: (process.env.MONGODB_URI || process.env.DATABASE_URL || '').substring(0, 15),
          mongodbDbExists: !!process.env.MONGODB_DB,
          mongodbConnectOk: testDb.ok,
          mongodbConnectError: testDb.error
        }
      }, { status: (!clientId || !clientSecret || !authSecret || !testDb.ok) ? 500 : 200 });
    }

    // A. Handle OAuth Callback from Google
    if (code) {
      if (errorParam) {
        console.error('Google OAuth redirect error parameter:', errorParam);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorParam)}`, request.url));
      }

      // 1. Exchange authorization code for token
      step = 'exchange-code';
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Failed to exchange Google OAuth code:', errText);
        return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
      }

      const tokenData = await tokenRes.json();
      const { access_token } = tokenData;

      // 2. Fetch user profile from Google userinfo endpoint
      step = 'fetch-userinfo';
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      if (!userinfoRes.ok) {
        console.error('Failed to fetch userinfo from Google');
        return NextResponse.redirect(new URL('/login?error=userinfo_fetch_failed', request.url));
      }

      const googleUser = await userinfoRes.json();
      const { sub, email, name, picture } = googleUser;

      if (!email) {
        return NextResponse.redirect(new URL('/login?error=no_email_returned', request.url));
      }

      // 3. Resolve or create customer account record
      step = 'db-read-users';
      const users = await db.readTable<any>('users') || [];
      let customer = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() || u.googleProviderId === sub);

      const now = new Date().toISOString();

      if (customer) {
        step = 'db-update-user';
        customer.googleProviderId = sub;
        customer.name = name || customer.name;
        if (picture) {
          customer.profileImage = picture;
        }
        customer.lastLoginAt = now;
        await db.writeTable('users', users);
      } else {
        step = 'db-create-user';
        customer = {
          userId: 'u-' + Math.floor(1000 + Math.random() * 9000),
          googleProviderId: sub,
          name: name || email.split('@')[0],
          email: email,
          profileImage: picture || '',
          createdAt: now,
          lastLoginAt: now,
          wellnessAccessStatus: 'NOT_REQUESTED'
        };
        users.push(customer);
        await db.writeTable('users', users);
      }

      // 4. Issue customer session
      step = 'create-session';
      const session = await createSession(customer.userId, customer.email, 'customer');

      // 5. Set session cookie and redirect to intended destination
      step = 'create-cookie';
      const response = new NextResponse(
        `<html><head><meta http-equiv="refresh" content="0;url=${encodeURI(callback)}" /></head><body><script>window.location.href="${callback}";</script></body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );

      response.cookies.set('fatafat_session_token', session.sessionId, {
        httpOnly: true,
        secure: protocol === 'https',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return response;
    }

    // B. Initiate Authorization flow
    step = 'initiate-auth-flow';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&state=${encodeURIComponent(callback)}` +
      `&access_type=offline` +
      `&prompt=select_account`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (err: any) {
    console.error(`Error handling Google login Route at step [${step}]:`, err);
    return NextResponse.json({
      error: 'Server error',
      message: err.message || String(err),
      step,
      stack: err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : undefined
    }, { status: 500 });
  }
}
