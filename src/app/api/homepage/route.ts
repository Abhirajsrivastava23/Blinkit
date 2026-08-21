import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export async function GET() {
  try {
    const config = db.readHomepage();
    return NextResponse.json(config);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to read homepage settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const current = db.readHomepage();
    const updated = {
      ...current,
      ...body,
      sectionsVisibility: {
        ...(current.sectionsVisibility || {}),
        ...(body.sectionsVisibility || {})
      }
    };
    db.writeHomepage(updated);
    db.logActivity('Admin', 'Homepage Redesign Update', 'Storefront Layout Configuration', JSON.stringify(current), JSON.stringify(updated));
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update homepage settings' }, { status: 500 });
  }
}
