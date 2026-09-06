import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';
import { safeErrorResponse } from '../../../../lib/security';

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
        { error: 'Unauthorized: Admin authorization required to access user list.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    const users = (await db.readTable<any>('users')) || [];

    // Redact any password hashes or sensitive security tokens
    const safeUsers = users.map((u: any) => {
      const clean = { ...u };
      delete clean.passwordHash;
      delete clean.passwordhash;
      delete clean.password_hash;
      delete clean.googleProviderId;
      delete clean.googleproviderid;
      return clean;
    });

    return NextResponse.json(safeUsers, { headers: noStoreHeaders });
  } catch (err) {
    return safeErrorResponse(err, 'Failed to retrieve users registry.', 500, noStoreHeaders);
  }
}
