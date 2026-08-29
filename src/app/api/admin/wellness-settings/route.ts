import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const configRes = await db.query("SELECT data FROM config WHERE key = 'wellness_settings'");
    const data = configRes.rows[0]?.data || { published: false };
    return NextResponse.json(data);
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

    const { published } = await request.json();
    if (published === undefined) {
      return NextResponse.json({ error: 'Published state boolean is required' }, { status: 400 });
    }

    // Get previous value
    const configRes = await db.query("SELECT data FROM config WHERE key = 'wellness_settings'");
    const prevPublished = (configRes.rows[0]?.data as any)?.published ?? false;

    // Update wellness settings
    await db.query(
      "INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2",
      ['wellness_settings', JSON.stringify({ published })]
    );

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
      reason: `Toggled publication from ${prevPublished} to ${published}`
    };
    auditLogs.push(auditEvent);
    await db.writeTable('auditLogs', auditLogs);

    return NextResponse.json({ success: true, published });
  } catch (err) {
    console.error('Error updating wellness settings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
