import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';

const SALT = 'fatafat_salt';

// 1. Hash password with salt
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

// 2. Create session token and store it
export function createSession(userId: string, email: string, role: string): any {
  const sessions = db.readTable<any>('sessions') || [];
  const sessionId = 'sess-' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const newSession = {
    sessionId,
    userId,
    email,
    role,
    expiresAt
  };

  sessions.push(newSession);
  db.writeTable('sessions', sessions);
  return newSession;
}

// 3. Get session details from cookies or Authorization header
export async function getSession(request?: Request): Promise<any | null> {
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
    } catch (e) {
      // Cookies might throw if called outside Next request context
    }
  }

  if (!token) return null;

  const sessions = db.readTable<any>('sessions') || [];
  const session = sessions.find(s => s.sessionId === token);
  if (!session) return null;

  // Validate expiration
  if (new Date(session.expiresAt) < new Date()) {
    // Delete expired session
    db.writeTable('sessions', sessions.filter(s => s.sessionId !== token));
    return null;
  }

  return session;
}

// 4. Delete session (Logout)
export function deleteSession(sessionId: string): void {
  const sessions = db.readTable<any>('sessions') || [];
  db.writeTable('sessions', sessions.filter(s => s.sessionId !== sessionId));
}

// 5. Endpoint guard helper to check required roles
export async function validateRole(request: Request, allowedRoles: string[]): Promise<any | null> {
  const session = await getSession(request);
  if (!session) return null;

  if (allowedRoles.includes(session.role)) {
    return session;
  }
  return null;
}
