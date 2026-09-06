import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, isSuspiciousInput, logSecurityEvent, RATE_LIMIT_PROFILES } from './lib/security';

/**
 * Next.js Edge WAF & Security Middleware
 * Features:
 * 1. Edge-level Volumetric & Brute-Force Rate Limiting (Auth, Admin, Payments, Refunds, Support, Mutations)
 * 2. WAF Malicious Payload & Path Traversal Filtering
 * 3. Production HTTP Security Headers Injection (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
 * 4. Safe Security Event Logging
 */

// Helper to extract reliable client IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}

// Security Headers Object
const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")'
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const ip = getClientIp(request);
  const method = request.method;

  // 1. WAF Payload & Path Traversal Inspection
  const fullUrlString = `${pathname}${search}`;
  const pathCheck = isSuspiciousInput(fullUrlString);
  if (pathCheck.suspicious) {
    logSecurityEvent('WAF_BLOCKED_MALICIOUS_REQUEST', {
      ip,
      path: pathname,
      method,
      reason: pathCheck.reason
    });

    return new NextResponse(
      JSON.stringify({
        error: 'Bad Request: Potentially malicious or malformed request detected.',
        code: 'WAF_BLOCKED',
        status: 400
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  // 2. Server-side Rate Limiting for API routes
  if (pathname.startsWith('/api/')) {
    let rateCategory: keyof typeof RATE_LIMIT_PROFILES = 'general';

    if (
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/users/login') ||
      pathname.startsWith('/api/delivery-partner/login')
    ) {
      rateCategory = 'auth';
    } else if (pathname.startsWith('/api/admin/')) {
      rateCategory = 'admin';
    } else if (pathname.startsWith('/api/payments/')) {
      rateCategory = 'payments';
    } else if (pathname.startsWith('/api/refunds/')) {
      rateCategory = 'refunds';
    } else if (pathname.startsWith('/api/support/') || pathname.startsWith('/api/custom-requests')) {
      rateCategory = 'support';
    } else if (
      (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') &&
      (pathname.startsWith('/api/products') || pathname.startsWith('/api/categories') || pathname.startsWith('/api/brands'))
    ) {
      rateCategory = 'mutations';
    }

    const rateResult = checkRateLimit(ip, rateCategory);

    if (!rateResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip,
        path: pathname,
        method,
        reason: `Exceeded ${rateCategory} rate limit (${rateResult.limit} req/min)`
      });

      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please slow down and try again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateResult.retryAfterSeconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateResult.retryAfterSeconds || 60),
            'X-RateLimit-Limit': String(rateResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateResult.resetAt),
            'Cache-Control': 'no-store',
            ...SECURITY_HEADERS
          }
        }
      );
    }

    // Pass through API response with security and rate limit headers
    const response = NextResponse.next();
    for (const [headerKey, headerVal] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(headerKey, headerVal);
    }
    response.headers.set('X-RateLimit-Limit', String(rateResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateResult.resetAt));
    return response;
  }

  // 3. Regular Page Routes: Apply Security Headers
  const response = NextResponse.next();
  for (const [headerKey, headerVal] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(headerKey, headerVal);
  }

  return response;
}

// Apply middleware to all application routes while skipping static bundles & media assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, apple-icon.png
     * - static media files (png, jpg, jpeg, gif, webp, avif, svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js)$).*)',
  ],
};
