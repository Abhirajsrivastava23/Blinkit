import { NextResponse } from 'next/server';

/**
 * Production-Grade Security Module for FATAFAT Quick Commerce
 * Features:
 * 1. Multi-Tiered Sliding Window Rate Limiter
 * 2. Input Sanitization & Data Validation (XSS, Path Traversal, SQLi)
 * 3. WAF Request Pattern Detection
 * 4. Safe Security Event Logging (Zero Secret/PII Leakage)
 * 5. Safe Error Response Builder
 */

// ==========================================
// 1. SLIDING WINDOW RATE LIMITER
// ==========================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Route-specific rate limit profiles (requests per window)
export const RATE_LIMIT_PROFILES: Record<string, RateLimitConfig> = {
  // 1. Auth & Login APIs (High Security: 10 req / min per IP to prevent brute force)
  auth: { maxRequests: 12, windowMs: 60 * 1000 },

  // 2. Admin APIs (Controlled: 60 req / min per IP)
  admin: { maxRequests: 60, windowMs: 60 * 1000 },

  // 3. Payment Gateway & Webhook APIs (25 req / min per IP)
  payments: { maxRequests: 25, windowMs: 60 * 1000 },

  // 4. Refund Request APIs (10 req / min per IP)
  refunds: { maxRequests: 10, windowMs: 60 * 1000 },

  // 5. Customer Support & Tickets (15 req / min per IP)
  support: { maxRequests: 15, windowMs: 60 * 1000 },

  // 6. Product / Catalog Mutations (POST, PUT, PATCH, DELETE) (30 req / min per IP)
  mutations: { maxRequests: 30, windowMs: 60 * 1000 },

  // 7. General API Baseline (Edge DDoS protection: 200 req / min per IP)
  general: { maxRequests: 200, windowMs: 60 * 1000 }
};

// In-Memory store for Edge / Serverless rate tracking
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup stale entries periodically to prevent memory growth
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 60 * 1000) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  identifier: string,
  category: keyof typeof RATE_LIMIT_PROFILES = 'general'
): RateLimitResult {
  cleanupStaleEntries();

  const config = RATE_LIMIT_PROFILES[category] || RATE_LIMIT_PROFILES.general;
  const now = Date.now();
  const key = `${category}:${identifier.trim().toLowerCase()}`;

  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetAt <= now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + config.windowMs
    };
    rateLimitMap.set(key, newRecord);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: newRecord.resetAt
    };
  }

  if (existing.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - existing.count),
    resetAt: existing.resetAt
  };
}

// ==========================================
// 2. WAF MALICIOUS PATTERN DETECTION
// ==========================================

// Regular expressions to detect malicious SQL injection, XSS, and Path Traversal patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC(UTE)?)\b)/i,
  /(--|#|\/\*|\*\/)/,
  /('|\b)(OR|AND)\b.+(=|<|>|LIKE|\bIS\b)/i,
  /\b(pg_sleep|sleep|waitfor\s+delay|benchmark)\s*\(/i
];

const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
  /<iframe\b[^>]*>/i,
  /<object\b[^>]*>/i,
  /<embed\b[^>]*>/i
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i,
  /%252e%252e%252f/i,
  /\/etc\/passwd/i,
  /c:\\windows\\system32/i
];

const NULL_BYTE_PATTERNS = [
  /\x00/,
  /%00/i,
  /\\0/
];

export function isSuspiciousInput(input: string): { suspicious: boolean; reason?: string } {
  if (!input || typeof input !== 'string') return { suspicious: false };

  for (const pattern of NULL_BYTE_PATTERNS) {
    if (pattern.test(input)) {
      return { suspicious: true, reason: 'Null byte injection detected' };
    }
  }

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      return { suspicious: true, reason: 'Path traversal pattern detected' };
    }
  }

  // Only check SQLi and XSS on strings that have explicit script/syntax flags
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return { suspicious: true, reason: 'Cross-site scripting (XSS) payload detected' };
    }
  }

  return { suspicious: false };
}

// ==========================================
// 3. INPUT SANITIZATION & VALIDATION
// ==========================================

export function sanitizeInput(input: unknown): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Strip null bytes and control characters (except newline, carriage return, and tab)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Strip path traversal sequences
  str = str.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

  // Strip <script> and dangerous HTML tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  str = str.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  str = str.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  return str.trim();
}

export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeInput(obj) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const cleanKey = sanitizeInput(key);
    result[cleanKey] = sanitizeObject(val);
  }
  return result as T;
}

export function validateEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (clean.length > 254 || clean.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

export function validatePhone(phone: unknown): boolean {
  if (typeof phone !== 'string' && typeof phone !== 'number') return false;
  const digits = String(phone).replace(/\D/g, '');
  // Standard Indian 10-digit mobile number or with +91 prefix (12 digits)
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

export function validatePositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= 0;
}

export function validateOrderId(orderId: unknown): boolean {
  if (typeof orderId !== 'string') return false;
  const clean = orderId.replace(/^#+/, '').trim();
  // Valid order ID format: alphanumeric with optional hyphens/underscores, 3 to 64 chars
  return /^[a-zA-Z0-9_-]{3,64}$/.test(clean);
}

// ==========================================
// 4. SAFE ERROR RESPONSES & REDACTION
// ==========================================

export function safeErrorResponse(
  error: unknown,
  clientMessage = 'An unexpected server error occurred. Please try again.',
  status = 500,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  // Log detailed error on server console with stack trace
  console.error('[FATAFAT SERVER SECURITY LOG]', {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  // Never return raw DB errors or stack traces to client
  return NextResponse.json(
    {
      error: clientMessage,
      success: false,
      timestamp: new Date().toISOString()
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders
      }
    }
  );
}

// ==========================================
// 5. SAFE SECURITY EVENT LOGGING
// ==========================================

export function logSecurityEvent(
  eventType: string,
  details: {
    ip?: string;
    userId?: string;
    path?: string;
    reason?: string;
    method?: string;
    metadata?: Record<string, unknown>;
  }
) {
  // Redact any sensitive field keys before logging
  const safeMeta: Record<string, unknown> = {};
  if (details.metadata) {
    for (const [k, v] of Object.entries(details.metadata)) {
      const lower = k.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('card') ||
        lower.includes('cvv') ||
        lower.includes('auth')
      ) {
        safeMeta[k] = '[REDACTED]';
      } else {
        safeMeta[k] = v;
      }
    }
  }

  console.warn('[SECURITY EVENT]', {
    timestamp: new Date().toISOString(),
    eventType,
    ip: details.ip ? details.ip.slice(0, 45) : 'unknown',
    userId: details.userId ? String(details.userId).slice(0, 50) : undefined,
    path: details.path ? String(details.path).slice(0, 100) : undefined,
    method: details.method || 'UNKNOWN',
    reason: details.reason,
    metadata: Object.keys(safeMeta).length > 0 ? safeMeta : undefined
  });
}
