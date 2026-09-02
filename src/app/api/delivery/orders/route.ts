export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    
    // Security: If partner, restrict strictly to their verified session userId. If admin, allow header/param filter.
    const partnerId = session.role === 'admin'
      ? (request.headers.get('x-partner-id') || searchParams.get('partnerId') || '')
      : session.userId;

    const orders = await db.readTable<any>('orders') || [];

    let filtered: any[] = [];
    if (session.role === 'admin') {
      if (partnerId) {
        const cleanPartnerId = partnerId.toLowerCase().trim();
        filtered = orders.filter((o: any) => String(o.assignedPartnerId || '').toLowerCase().trim() === cleanPartnerId);
      } else {
        filtered = orders;
      }
    } else {
      // delivery_partner role
      const cleanPartnerId = String(session.userId || '').toLowerCase().trim();
      const cleanPartnerEmail = String(session.email || '').toLowerCase().trim();
      filtered = orders.filter((o: any) => {
        const aId = String(o.assignedPartnerId || '').toLowerCase().trim();
        return aId && (aId === cleanPartnerId || aId === cleanPartnerEmail);
      });
    }

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

