import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { createSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

interface UserRecord {
  userId: string;
  googleProviderId?: string | null;
  name: string;
  email: string;
  profileImage?: string;
  createdAt: string;
  lastLoginAt: string;
  wellnessAccessStatus: string;
  wellnessRequestId?: string | null;
  wellnessApprovedAt?: string | null;
  wellnessApprovedBy?: string | null;
  phone?: string;
  dob?: string;
  gender?: string;
  addresses?: unknown;
}

function getValidatedRedirectUri(requestUrlStr: string): string {
  const url = new URL(requestUrlStr);
  const origin = url.origin.toLowerCase();

  const ALLOWED_ORIGINS = [
    'https://fatafatapp.me',
    'https://www.fatafatapp.me',
    'https://fatafat-app.vercel.app'
  ];

  const isDevelopment = process.env.NODE_ENV === 'development';
  // Match localhost or 127.0.0.1 with any port
  const isLocalhost = origin.startsWith('http://localhost:') || origin === 'http://localhost' || origin.startsWith('http://127.0.0.1:') || origin === 'http://127.0.0.1';

  if (ALLOWED_ORIGINS.includes(origin) || (isDevelopment && isLocalhost)) {
    return `${origin}/api/auth/google-login`;
  }

  // Security fallback to main production domain
  return 'https://fatafatapp.me/api/auth/google-login';
}

function getValidatedCallback(callbackParam: string | null): string {
  if (!callbackParam) {
    return '/';
  }

  // Prevent redirect loops
  if (callbackParam.includes('/api/auth/google-login')) {
    return '/';
  }

  // Allow safe relative paths
  if (callbackParam.startsWith('/') && !callbackParam.startsWith('//')) {
    return callbackParam;
  }

  try {
    const url = new URL(callbackParam);
    const origin = url.origin.toLowerCase();

    const ALLOWED_ORIGINS = [
      'https://fatafatapp.me',
      'https://www.fatafatapp.me',
      'https://fatafat-app.vercel.app'
    ];

    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = origin.startsWith('http://localhost:') || origin === 'http://localhost' || origin.startsWith('http://127.0.0.1:') || origin === 'http://127.0.0.1';

    if (ALLOWED_ORIGINS.includes(origin) || (isDevelopment && isLocalhost)) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Fail silently to safe fallback
  }

  return '/';
}

export async function GET(request: Request) {
  let step = 'init';
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const callback = getValidatedCallback(searchParams.get('state') || searchParams.get('callback') || '/');
    const errorParam = searchParams.get('error');

    const redirectUri = getValidatedRedirectUri(request.url);
    const isSecure = redirectUri.startsWith('https:');

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
          postgresUrlExists: !!(process.env.POSTGRES_URL || process.env.DATABASE_URL),
          postgresUrlLength: (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').length,
          postgresUrlPrefix: (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').split(':')[0] || '',
          postgresConnectOk: testDb.ok,
          postgresConnectError: testDb.error
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
        console.error(`Failed to exchange Google OAuth code. Status: ${tokenRes.status}`);
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

      const googleUser = await userinfoRes.json() as { sub: string; email: string; name?: string; picture?: string };
      const { sub, email, name, picture } = googleUser;

      if (!email) {
        return NextResponse.redirect(new URL('/login?error=no_email_returned', request.url));
      }

      // 3. Resolve or create customer account record
      step = 'db-read-users';
      const users = await db.readTable<UserRecord>('users') || [];
      let customer = users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.googleProviderId === sub);

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
        secure: isSecure,
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
  } catch (err: unknown) {
    const errorObject = err instanceof Error ? err : new Error(String(err));
    console.error(`Error handling Google login Route at step [${step}]:`, errorObject);
    return NextResponse.json({
      error: 'Server error',
      message: errorObject.message || String(err),
      step,
      stack: errorObject.stack ? errorObject.stack.split('\n').slice(0, 3).join(' | ') : undefined
    }, { status: 500 });
  }
}
