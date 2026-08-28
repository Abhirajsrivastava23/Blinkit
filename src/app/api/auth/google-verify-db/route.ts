import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.query(
      'SELECT "userId", name, email, "googleProviderId", "lastLoginAt" FROM users WHERE "googleProviderId" IS NOT NULL ORDER BY "lastLoginAt" DESC LIMIT 5'
    );
    return NextResponse.json({
      success: true,
      users: users.rows
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    });
  }
}
