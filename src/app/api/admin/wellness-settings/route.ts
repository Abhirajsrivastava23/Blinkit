import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const settings = await db.getWellnessSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error('Error fetching wellness settings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const body = await request.json();
    const { published } = body;
    if (published === undefined) {
      return NextResponse.json({ error: 'Published state boolean is required' }, { status: 400 });
    }

    const prevSettings = await db.getWellnessSettings();
    await db.setWellnessSettings(Boolean(published));

    // Save event to audit log
    const auditLogs = await db.readTable<any>('auditLogs') || [];
    const auditEvent = {
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 100),
      userId: 'Admin',
      userEmail: adminSession.email,
      userName: 'FATAFAT Super Admin',
      action: published ? 'Wellness section published' : 'Wellness section unpublished',
      adminId: adminSession.email,
      timestamp: new Date().toISOString(),
      requestId: 'system-settings',
      reason: `Toggled publication from ${prevSettings.published} to ${published}`
    };
    auditLogs.push(auditEvent);
    await db.writeTable('auditLogs', auditLogs);

    return NextResponse.json({ success: true, published: Boolean(published) });
  } catch (err) {
    console.error('Error updating wellness settings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
