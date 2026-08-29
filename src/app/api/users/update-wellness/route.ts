import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, wellnessAccessStatus, approvedBy, requestId, reason } = body;
    
    if (!email || !wellnessAccessStatus) {
      return NextResponse.json({ error: 'Email and wellnessAccessStatus are required' }, { status: 400 });
    }

    const users = await db.readTable<any>('users') || [];
    const idx = users.findIndex((u: any) => u.email === email);
    
    if (idx === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[idx];
    const prevStatus = user.wellnessAccessStatus;
    user.wellnessAccessStatus = wellnessAccessStatus;
    
    const finalRequestId = requestId || user.wellnessRequestId || 'req-' + Math.floor(10000 + Math.random() * 90000);
    user.wellnessRequestId = finalRequestId;
    
    if (wellnessAccessStatus === 'APPROVED') {
      user.wellnessApprovedAt = new Date().toISOString();
      user.wellnessApprovedBy = approvedBy || 'Admin';
    }
    
    users[idx] = user;
    await db.writeTable('users', users);

    // Save event to central audit table
    const auditLogs = await db.readTable<any>('auditLogs') || [];
    
    let actionLabel = 'Wellness access requested';
    if (wellnessAccessStatus === 'APPROVED') actionLabel = 'Wellness access approved';
    else if (wellnessAccessStatus === 'REJECTED') actionLabel = 'Wellness access rejected';
    else if (wellnessAccessStatus === 'SUSPENDED') actionLabel = 'Wellness access suspended';
    else if (wellnessAccessStatus === 'REVOKED') actionLabel = 'Wellness access revoked';
    else if (wellnessAccessStatus === 'NOT_REQUESTED' && prevStatus === 'SUSPENDED') actionLabel = 'Wellness access restored';
    else if (wellnessAccessStatus === 'NOT_REQUESTED') actionLabel = 'Wellness access reset';
    
    const auditEvent = {
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 100),
      userId: user.userId,
      userEmail: user.email,
      userName: user.name,
      action: actionLabel,
      adminId: approvedBy || 'Admin',
      timestamp: new Date().toISOString(),
      requestId: finalRequestId,
      reason: reason || ''
    };
    
    auditLogs.push(auditEvent);
    await db.writeTable('auditLogs', auditLogs);

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('Error updating wellness status:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
