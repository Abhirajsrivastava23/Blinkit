import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { validateRole } from '../../../data/auth';
import { safeErrorResponse } from '../../../lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Content-Type-Options': 'nosniff'
};

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin credentials required to view audit activity.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    const logs = await db.readTable('auditLogs');
    return NextResponse.json(logs, { headers: noStoreHeaders });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch audit activity logs.', 500, noStoreHeaders);
  }
}
