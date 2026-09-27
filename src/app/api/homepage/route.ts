import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { validateRole } from '../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const config = await db.readHomepage();
    return NextResponse.json(config);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to read homepage settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const adminSession = await validateRole(req, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authorization required to update homepage settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const current = await db.readHomepage();
    const updated = {
      ...current,
      ...body,
      sectionsVisibility: {
        ...(current.sectionsVisibility || {}),
        ...(body.sectionsVisibility || {})
      }
    };
    await db.writeHomepage(updated);
    db.logActivity(adminSession.email || 'Admin', 'Homepage Redesign Update', 'Storefront Layout Configuration', JSON.stringify(current), JSON.stringify(updated));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update homepage settings' }, { status: 500 });
  }
}

