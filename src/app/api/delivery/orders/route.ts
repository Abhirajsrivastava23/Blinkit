export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

export async function GET(request: Request) {
  try {
    // 1. Validate session and role (delivery partner or admin allowed)
    const session = await validateRole(request, ['delivery_partner', 'admin']);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Security: If partner, restrict to their verified session userId. If admin, trust header/param.
    const partnerId = session.role === 'admin'
      ? (request.headers.get('x-partner-id') || searchParams.get('partnerId') || '')
      : session.userId;

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId is required.' }, { status: 400 });
    }

    const orders = await db.readTable<any>('orders') || [];
    const filtered = orders.filter((o: any) => o.assignedPartnerId === partnerId);

    const sanitized = filtered.map((o: any) => {
      const { deliveryOtp, ...rest } = o;
      return rest;
    });
    
    return NextResponse.json(sanitized);
  } catch (err) {
    console.error('Error fetching delivery orders:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
