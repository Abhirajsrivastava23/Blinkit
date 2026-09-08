import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, getPool } from '@/data/db';
import { sendPasswordResetEmail } from '@/services/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string };
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // Check if user or admin exists
    const users = await db.readTable<any>('users').catch(() => []) || [];
    const admins = await db.readTable<any>('admin').catch(() => []) || [];

    const userExists = users.some((u: any) => String(u.email || '').toLowerCase() === email) ||
                       admins.some((a: any) => String(a.email || '').toLowerCase() === email);

    // Generate secure token and expiry (30 mins)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const host = request.headers.get('host') || 'www.fatafatapp.me';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Store reset token securely in sessions table or config
    const activePool = getPool();
    if (activePool) {
      try {
        await activePool.query(`
          INSERT INTO sessions (sessionid, userid, email, role, expiresat)
          VALUES ($1, $2, $3, $4, $5)
        `, [`reset-${resetToken}`, email, email, 'password_reset', expiresAt]);
      } catch (dbErr) {
        console.warn('Could not persist reset token to PostgreSQL sessions:', dbErr);
      }
    }

    // Trigger transactional password reset email
    await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been sent.'
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    return NextResponse.json({ error: 'Internal server error processing password reset.' }, { status: 500 });
  }
}
