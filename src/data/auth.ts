import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';

export interface Session {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  expiresAt: string;
}

// 1. Hash password with salt (Force reload trigger)
export function hashPassword(password: string): string {
  const salt = process.env['AUTH_SECRET'] || 'fatafat_salt';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// 2. Create session token and store it
export async function createSession(userId: string, email: string, role: string): Promise<Session> {
  const sessionId = 'sess-' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const newSession: Session = {
    sessionId,
    userId,
    email,
    role,
    expiresAt
  };

  await db.query(
    'INSERT INTO sessions ("sessionId", "userId", email, role, "expiresAt") VALUES ($1, $2, $3, $4, $5)',
    [sessionId, userId, email, role, expiresAt]
  );
  return newSession;
}

// 3. Get session details from cookies or Authorization header
export async function getSession(request?: Request): Promise<Session | null> {
  let token = '';

  // Attempt header extraction
  if (request) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }
  }

  // Attempt cookie extraction if no header token
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('fatafat_session_token')?.value || '';
    } catch {
      // Cookies might throw if called outside Next request context
    }
  }

  if (!token) return null;

  const sessions = await db.readTable<Session>('sessions') || [];
  const session = sessions.find(s => s.sessionId === token);
  if (!session) return null;

  // Validate expiration
  if (new Date(session.expiresAt) < new Date()) {
    // Delete expired session
    await db.writeTable('sessions', sessions.filter(s => s.sessionId !== token));
    return null;
  }

  return session;
}

// 4. Delete session (Logout)
export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await db.readTable<Session>('sessions') || [];
  await db.writeTable('sessions', sessions.filter(s => s.sessionId !== sessionId));
}

// 5. Endpoint guard helper to check required roles
export async function validateRole(request: Request, allowedRoles: string[]): Promise<Session | null> {
  const session = await getSession(request);
  if (!session) return null;

  if (allowedRoles.includes(session.role)) {
    return session;
  }
  return null;
}
