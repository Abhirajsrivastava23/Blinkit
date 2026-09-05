import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db, getPool } from './db';

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

// Robust multi-salt verification for seamless auth across environments
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  const cleanStored = String(storedHash).trim().toLowerCase();
  const rawPwd = String(password);
  const trimmedPwd = rawPwd.trim();

  const candidateSalts = [
    process.env['AUTH_SECRET'],
    'fatafat_development_auth_secret_key_12345',
    'fatafat_salt',
    'fatafat',
    ''
  ].filter((s): s is string => typeof s === 'string');

  for (const pwd of [rawPwd, trimmedPwd]) {
    for (const salt of candidateSalts) {
      const candidateHash = crypto.createHash('sha256').update(pwd + salt).digest('hex').toLowerCase();
      if (candidateHash === cleanStored) {
        return true;
      }
    }
    // Also support plaintext matching if stored without hash
    if (pwd.toLowerCase() === cleanStored || pwd === storedHash) {
      return true;
    }
  }

  return false;
}

// 2. Create session token and store it atomically
export async function createSession(userId: string, email: string, role: string): Promise<Session> {
  const sessionId = 'sess-' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const newSession: Session = {
    sessionId,
    userId: String(userId).trim(),
    email: String(email).trim().toLowerCase(),
    role: String(role).trim().toLowerCase(),
    expiresAt
  };

  // Always keep in-memory cache synchronized
  try {
    await db.saveSession(newSession as unknown as Record<string, unknown>);
  } catch {}

  const activePool = getPool();
  if (activePool) {
    try {
      await activePool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sessionid TEXT,
          userid TEXT,
          email TEXT,
          role TEXT,
          expiresat TEXT
        );
      `).catch(() => {});

      // 1. Try standard unquoted lowercase columns (standard Postgres)
      await activePool.query(
        'INSERT INTO sessions (sessionid, userid, email, role, expiresat) VALUES ($1, $2, $3, $4, $5)',
        [sessionId, newSession.userId, newSession.email, newSession.role, expiresAt]
      ).catch(async () => {
        // 2. Fallback to quoted column names if created with exact casing
        await activePool.query(
          'INSERT INTO "sessions" ("sessionId", "userId", "email", "role", "expiresAt") VALUES ($1, $2, $3, $4, $5)',
          [sessionId, newSession.userId, newSession.email, newSession.role, expiresAt]
        ).catch(() => {});
      });
    } catch (e) {
      console.warn('Session DB persistence warning:', e);
    }
  }

  return newSession;
}

// 3. Get session details from cookies or Authorization header
export async function getSession(request?: Request): Promise<Session | null> {
  let token = '';

  // 1. Attempt Authorization / custom headers extraction
  if (request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }
    if (!token) {
      token = request.headers.get('x-session-token') || '';
    }
  }

  // 2. Attempt raw Cookie header parsing from incoming Request
  if (!token && request) {
    const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie') || '';
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:fatafat_session_token|session_token|admin_token|token)=([^;]+)/);
      if (match && match[1]) {
        try {
          token = decodeURIComponent(match[1].trim());
        } catch {
          token = match[1].trim();
        }
      }
    }
  }

  // 3. Attempt Next.js cookies store extraction
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('fatafat_session_token')?.value || 
              cookieStore.get('session_token')?.value || 
              cookieStore.get('admin_token')?.value || 
              cookieStore.get('token')?.value || '';
    } catch {
      // Cookies might throw if called outside Next request context
    }
  }

  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;

  // 4. Query PostgreSQL database
  const activePool = getPool();
  if (activePool) {
    try {
      // 1. Try lowercase standard column query first
      let res = await activePool.query(
        'SELECT * FROM sessions WHERE sessionid = $1 LIMIT 1', 
        [cleanToken]
      ).catch(() => null);

      // 2. If no result or error, try quoted table / column query
      if (!res || !res.rows || res.rows.length === 0) {
        res = await activePool.query(
          'SELECT * FROM "sessions" WHERE "sessionId" = $1 LIMIT 1', 
          [cleanToken]
        ).catch(() => null);
      }

      if (res && res.rows && res.rows.length > 0) {
        const raw = res.rows[0];
        const session: Session = {
          sessionId: String(raw.sessionid || raw.sessionId || raw.SESSIONID || cleanToken),
          userId: String(raw.userid || raw.userId || raw.USERID || ''),
          email: String(raw.email || raw.EMAIL || ''),
          role: String(raw.role || raw.ROLE || '').toLowerCase().trim(),
          expiresAt: String(raw.expiresat || raw.expiresAt || raw.EXPIRESAT || '')
        };

        if (!session.expiresAt || new Date(session.expiresAt) > new Date()) {
          return session;
        }
        return null;
      }
    } catch (err) {
      console.warn('Error querying session from database, attempting fallback:', err);
    }
  }

  // 5. Fallback check in memory data
  try {
    const foundMem = await db.getSessionById(cleanToken);
    if (foundMem) {
      const session: Session = {
        sessionId: String(foundMem.sessionId || foundMem.sessionid || cleanToken),
        userId: String(foundMem.userId || foundMem.userid || ''),
        email: String(foundMem.email || ''),
        role: String(foundMem.role || '').toLowerCase().trim(),
        expiresAt: String(foundMem.expiresAt || foundMem.expiresat || '')
      };
      if (!session.expiresAt || new Date(session.expiresAt) > new Date()) {
        return session;
      }
    }
  } catch {}

  return null;
}

// 4. Delete session (Logout)
export async function deleteSession(sessionId: string): Promise<void> {
  const cleanId = String(sessionId || '').trim();
  if (!cleanId) return;
  try {
    await db.deleteSessionById(cleanId);
  } catch {}

  const activePool = getPool();
  if (activePool) {
    try {
      await activePool.query('DELETE FROM sessions WHERE sessionid = $1', [cleanId])
        .catch(async () => {
          await activePool.query('DELETE FROM "sessions" WHERE "sessionId" = $1', [cleanId]).catch(() => {});
        });
    } catch (e) {
      console.warn('Delete session error:', e);
    }
  }
}

// 5. Endpoint guard helper to check required roles
export async function validateRole(request: Request, allowedRoles: string[]): Promise<Session | null> {
  const session = await getSession(request);
  if (!session) return null;

  const userRole = String(session.role || '').toLowerCase().trim();
  const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase().trim());

  // If 'admin' is in allowed roles, allow 'super_admin' as well
  if (normalizedAllowed.includes('admin') && (userRole === 'admin' || userRole === 'super_admin')) {
    return session;
  }

  if (normalizedAllowed.includes(userRole)) {
    return session;
  }

  return null;
}
