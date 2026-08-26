import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { createSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

interface UserRecord {
  [key: string]: unknown;
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
    // Normalize both custom production domains to https://fatafatapp.me
    if (origin === 'https://fatafatapp.me' || origin === 'https://www.fatafatapp.me') {
      return 'https://fatafatapp.me/api/auth/google-login';
    }
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
  const tStart = performance.now();
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
    // Secure environment diagnostics check (boolean checks to prevent secret leakage)
    if (!clientId || !clientSecret || !authSecret || showDiagnostics) {
      console.error('Google authentication configuration check.');
      return NextResponse.json({
        oauthClientConfigured: !!clientId && !!clientSecret && !!authSecret,
        redirectUriUsed: redirectUri,
        requestOrigin: new URL(request.url).origin,
        expectedProductionRedirectUri: 'https://fatafatapp.me/api/auth/google-login'
      }, { status: (!clientId || !clientSecret || !authSecret) ? 500 : 200 });
    }

    // A. Handle OAuth Callback from Google
    if (code) {
      if (errorParam) {
        console.error('Google OAuth redirect error parameter:', errorParam);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorParam)}`, request.url));
      }

      // 1. Exchange authorization code for token with 5-second timeout
      step = 'exchange-code';
      const tokenController = new AbortController();
      const tokenTimeout = setTimeout(() => tokenController.abort(), 5000);
      
      let tokenRes;
      const tExchangeStart = performance.now();
      try {
        tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          }),
          signal: tokenController.signal
        });
      } finally {
        clearTimeout(tokenTimeout);
      }
      const tExchangeEnd = performance.now();
      console.log(`[Google OAuth] Token exchange completed in ${(tExchangeEnd - tExchangeStart).toFixed(2)}ms`);

      if (!tokenRes.ok) {
        console.error(`Failed to exchange Google OAuth code. Status: ${tokenRes.status}`);
        return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
      }

      const tokenData = await tokenRes.json();
      const { access_token } = tokenData;

      // 2. Fetch user profile from Google userinfo endpoint with 5-second timeout
      step = 'fetch-userinfo';
      const userinfoController = new AbortController();
      const userinfoTimeout = setTimeout(() => userinfoController.abort(), 5000);
      
      let userinfoRes;
      const tUserinfoStart = performance.now();
      try {
        userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
          signal: userinfoController.signal
        });
      } finally {
        clearTimeout(userinfoTimeout);
      }
      const tUserinfoEnd = performance.now();
      console.log(`[Google OAuth] Userinfo fetch completed in ${(tUserinfoEnd - tUserinfoStart).toFixed(2)}ms`);

      if (!userinfoRes.ok) {
        console.error('Failed to fetch userinfo from Google');
        return NextResponse.redirect(new URL('/login?error=userinfo_fetch_failed', request.url));
      }

      const googleUser = await userinfoRes.json() as { sub: string; email: string; name?: string; picture?: string };
      const { sub, email, name, picture } = googleUser;

      if (!email) {
        return NextResponse.redirect(new URL('/login?error=no_email_returned', request.url));
      }

      // 3. Resolve or create customer account record using single-row DB queries
      step = 'db-resolve-user';
      const tDbStart = performance.now();
      const userRes = await db.query<UserRecord>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR "googleProviderId" = $2 LIMIT 1',
        [email, sub]
      );
      const customer = userRes.rows[0] || null;
      const tDbSelectEnd = performance.now();
      const now = new Date().toISOString();

      // Optimize: Generate userId up-front and parallelize User write + Session insertion
      const userId = customer ? customer.userId : 'u-' + Math.floor(1000 + Math.random() * 9000);
      const tDbWriteStart = performance.now();

      const dbWritePromise = customer
        ? db.query(
            'UPDATE users SET "googleProviderId" = $1, name = $2, "profileImage" = $3, "lastLoginAt" = $4 WHERE "userId" = $5',
            [sub, name || customer.name, picture || customer.profileImage || null, now, userId]
          )
        : db.query(
            'INSERT INTO users ("userId", "googleProviderId", name, email, "profileImage", "createdAt", "lastLoginAt", "wellnessAccessStatus") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [
              userId,
              sub,
              name || email.split('@')[0],
              email,
              picture || '',
              now,
              now,
              'NOT_REQUESTED'
            ]
          );

      const tSessionStart = performance.now();
      const sessionPromise = createSession(userId, email, 'customer');

      // Execute both queries concurrently to save 1 RTT (round-trip database latency)
      await Promise.all([dbWritePromise, sessionPromise]);
      
      const tDbWriteEnd = performance.now();
      const session = await sessionPromise;
      const tSessionEnd = performance.now();

      console.log(`[Google OAuth] Concurrent DB Write/Session completed in ${(tDbWriteEnd - tDbWriteStart).toFixed(2)}ms (select: ${(tDbSelectEnd - tDbStart).toFixed(2)}ms, write: ${(tDbWriteEnd - tDbWriteStart).toFixed(2)}ms, session: ${(tSessionEnd - tSessionStart).toFixed(2)}ms)`);

      // 5. Set session cookie and redirect to intended destination using safe HTTP 307 redirect
      step = 'create-redirect';
      const tRedirectStart = performance.now();
      const redirectUrl = new URL(callback, request.url);
      const response = NextResponse.redirect(redirectUrl, 307);

      response.cookies.set('fatafat_session_token', session.sessionId, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      // Explicitly set security headers to prevent sniffing, framing, and referrer leakage
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'no-referrer');
      response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");

      const tRedirectEnd = performance.now();
      
      const durInit = tExchangeStart - tStart;
      const durExchange = tExchangeEnd - tExchangeStart;
      const durUserinfo = tUserinfoEnd - tUserinfoStart;
      const durDbSelect = tDbSelectEnd - tDbStart;
      const durDbWrite = tDbWriteEnd - tDbWriteStart;
      const durSession = tSessionEnd - tSessionStart;
      const durRedirect = tRedirectEnd - tRedirectStart;
      const durTotal = tRedirectEnd - tStart;

      // Add standard Server-Timing header for browser transparency
      response.headers.set(
        'Server-Timing',
        `init;dur=${durInit.toFixed(1)}, exchange;dur=${durExchange.toFixed(1)}, userinfo;dur=${durUserinfo.toFixed(1)}, db_select;dur=${durDbSelect.toFixed(1)}, db_write;dur=${durDbWrite.toFixed(1)}, session;dur=${durSession.toFixed(1)}, redirect;dur=${durRedirect.toFixed(1)}, total;dur=${durTotal.toFixed(1)}`
      );

      console.log(`[Google OAuth] Redirect generation completed in ${durRedirect.toFixed(2)}ms`);
      console.log(`[Google OAuth] Total callback processing completed in ${durTotal.toFixed(2)}ms`);

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
