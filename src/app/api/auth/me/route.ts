import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ authenticated: false, error: 'Unauthorized session' }, { status: 401 });
    }

    if (session.role === 'admin') {
      const admins = db.readTable<any>('admin') || [];
      const adminObj = admins.find(a => a.email.toLowerCase() === session.email.toLowerCase());
      if (!adminObj) {
        return NextResponse.json({ authenticated: false, error: 'Admin record not found' }, { status: 401 });
      }
      return NextResponse.json({
        authenticated: true,
        user: {
          name: adminObj.name,
          email: adminObj.email,
          phone: adminObj.phone,
          role: 'admin'
        }
      });
    }

    if (session.role === 'delivery_partner') {
      const partners = db.readTable<any>('partners') || [];
      const partnerObj = partners.find(p => p.id === session.userId);
      if (!partnerObj) {
        return NextResponse.json({ authenticated: false, error: 'Delivery partner record not found' }, { status: 401 });
      }
      return NextResponse.json({
        authenticated: true,
        user: {
          name: partnerObj.name,
          email: partnerObj.email,
          phone: partnerObj.phone,
          role: 'delivery_partner',
          deliveryPartnerId: partnerObj.id,
          locationId: partnerObj.locationId,
          locationName: partnerObj.locationName,
          status: partnerObj.status,
          isOnline: partnerObj.isOnline
        }
      });
    }

    return NextResponse.json({ authenticated: false, error: 'Invalid session role' }, { status: 401 });
  } catch (err) {
    console.error('Session retrieval error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
