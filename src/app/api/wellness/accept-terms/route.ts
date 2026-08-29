import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized customer session required.' }, { status: 401 });
    }

    const { termsVersion } = await request.json();
    if (!termsVersion) {
      return NextResponse.json({ error: 'Terms version is required.' }, { status: 400 });
    }

    // Load PostgreSQL user record
    const userRes = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR "googleProviderId" = $2 OR "userId" = $3 LIMIT 1',
      [session.email, session.userId, session.userId]
    );
    const userObj = userRes.rows[0] as any;

    if (!userObj) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // Check age eligibility
    if (!userObj.dob) {
      return NextResponse.json({ error: 'Date of birth is missing from profile.' }, { status: 400 });
    }

    const dobDate = new Date(userObj.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json({ error: 'Access restricted: Minors (under 18) cannot accept Wellness terms.' }, { status: 403 });
    }

    // Record terms acceptance
    await db.query(
      `INSERT INTO wellness_terms_acceptances ("customerId", "termsVersion", "acceptedAt") 
       VALUES ($1, $2, $3) 
       ON CONFLICT ("customerId") 
       DO UPDATE SET "termsVersion" = $2, "acceptedAt" = $3`,
      [userObj.userId, termsVersion, new Date().toISOString()]
    );

    // Update user status to ACTIVE
    const users = await db.readTable<any>('users') || [];
    const idx = users.findIndex((u: any) => u.userId === userObj.userId);
    if (idx > -1) {
      users[idx].wellnessAccessStatus = 'ACTIVE';
      await db.writeTable('users', users);
    }

    // Log to audit log
    const auditLogs = await db.readTable<any>('auditLogs') || [];
    const auditEvent = {
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 100),
      userId: userObj.userId,
      userEmail: userObj.email,
      userName: userObj.name,
      action: 'Wellness terms accepted',
      adminId: 'System',
      timestamp: new Date().toISOString(),
      requestId: userObj.wellnessRequestId || 'v1',
      reason: `Accepted terms version: ${termsVersion}`
    };
    auditLogs.push(auditEvent);
    await db.writeTable('auditLogs', auditLogs);

    return NextResponse.json({ success: true, message: 'Wellness Terms accepted successfully.' });
  } catch (err) {
    console.error('Error accepting terms:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
