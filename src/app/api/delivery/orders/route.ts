export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: Request) {
  try {
    // 1. Validate session and role (delivery partner or admin allowed)
    const session = await validateRole(request, ['delivery_partner', 'admin', 'super_admin']);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403, headers: noStoreHeaders });
    }

    const { searchParams } = new URL(request.url);
    
    // Security: If partner, restrict strictly to their verified session userId. If admin, allow header/param filter.
    const partnerId = (session.role === 'admin' || session.role === 'super_admin')
      ? (request.headers.get('x-partner-id') || searchParams.get('partnerId') || '')
      : session.userId;

    const orders = await db.getOrders();

    let filtered: any[] = [];
    if (session.role === 'admin' || session.role === 'super_admin') {
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

      let myPartnerCustomId = '';
      let myPartnerPhone = '';
      try {
        const partnerRec = await db.getPartnerById(session.userId) || await db.getPartnerById(session.email);
        if (partnerRec) {
          myPartnerCustomId = String(partnerRec.id || '').toLowerCase().trim();
          myPartnerPhone = String(partnerRec.phone || '').replace(/\D/g, '');
        }
      } catch {}

      filtered = orders.filter((o: any) => {
        const aId = String(o.assignedPartnerId || '').toLowerCase().trim();
        if (!aId) return false;
        const aPhone = aId.replace(/\D/g, '');
        return (
          aId === cleanPartnerId ||
          aId === cleanPartnerEmail ||
          (myPartnerCustomId && aId === myPartnerCustomId) ||
          (myPartnerPhone && aPhone && (aId === myPartnerPhone || aPhone === myPartnerPhone))
        );
      });
    }

    const sanitized = filtered.map((o: any) => {
      const { deliveryOtp, ...rest } = o;
      return rest;
    });
    
    return NextResponse.json(sanitized, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error fetching delivery orders:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noStoreHeaders });
  }
}

