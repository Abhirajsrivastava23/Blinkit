import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized customer session required.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const termsVersion = body.termsVersion || 'v1.0';
    const reqDob = body.dob;

    const userObj = (await db.getUserById(session.userId)) || (await db.getUserById(session.email));

    if (!userObj) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const effectiveDob = reqDob || userObj.dob || '2000-01-01';
    const dobDate = new Date(effectiveDob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json({ error: 'Access restricted: Minors (under 18) cannot accept Wellness terms.' }, { status: 403 });
    }

    if (reqDob && reqDob !== userObj.dob) {
      await db.upsertUser({ ...userObj, dob: reqDob });
    }

    // Record terms acceptance
    try {
      await db.query(
        `INSERT INTO wellness_terms_acceptances ("customerId", "termsVersion", "acceptedAt") 
         VALUES ($1, $2, $3) 
         ON CONFLICT ("customerId") 
         DO UPDATE SET "termsVersion" = $2, "acceptedAt" = $3`,
        [userObj.userId, termsVersion, new Date().toISOString()]
      );
    } catch (e) {
      console.warn('wellness_terms_acceptances table insert warning:', e);
    }

    // Update user status to ACTIVE
    await db.upsertUser({ ...userObj, wellnessAccessStatus: 'ACTIVE' });

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
