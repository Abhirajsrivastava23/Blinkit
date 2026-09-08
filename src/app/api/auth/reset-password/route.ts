import { NextResponse } from 'next/server';
import { db, getPool } from '@/data/db';
import { hashPassword } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      token?: string;
      email?: string;
      newPassword?: string;
    };

    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '').trim();

    if (!token || !email || !newPassword) {
      return NextResponse.json({ error: 'Token, email, and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Verify token from sessions table
    const activePool = getPool();
    let isValidToken = false;

    if (activePool) {
      const tokenRes = await activePool.query(`
        SELECT * FROM sessions 
        WHERE (sessionid = $1 OR sessionid = $2) AND LOWER(email) = $3
      `, [token, `reset-${token}`, email]);

      if (tokenRes.rows.length > 0) {
        const sessionRow = tokenRes.rows[0];
        const expiresAt = new Date(sessionRow.expiresat || sessionRow.expiresAt);
        if (expiresAt > new Date()) {
          isValidToken = true;
          // Delete used reset token
          await activePool.query('DELETE FROM sessions WHERE sessionid = $1 OR sessionid = $2', [token, `reset-${token}`]);
        }
      }
    }

    if (!isValidToken) {
      return NextResponse.json({ error: 'Invalid or expired password reset link. Please request a new one.' }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);

    // Update in admin table if admin
    if (activePool) {
      await activePool.query('UPDATE admin SET passwordhash = $1 WHERE LOWER(email) = $2', [newHash, email]);
      await activePool.query('UPDATE users SET "lastLoginAt" = $1 WHERE LOWER(email) = $2', [new Date().toISOString(), email]);
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Password reset execution error:', err);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
