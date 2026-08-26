export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db, AdminRecord, PartnerRecord } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

interface UserRecord {
  [key: string]: unknown;
  userId: string;
  googleProviderId?: string | null;
  name: string;
  email: string;
  profileImage?: string;
  createdAt: string;
  lastLoginAt: string;
  wellnessAccessStatus: string;
  wellnessRequestId?: string | null;
  wellnessApprovedAt?: string | null;
  wellnessApprovedBy?: string | null;
  phone?: string;
  dob?: string;
  gender?: string;
  addresses?: unknown;
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ authenticated: false, error: 'Unauthorized session' }, { status: 401 });
    }

    if (session.role === 'admin') {
      const admins = await db.readTable<AdminRecord>('admin') || [];
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
      const partners = await db.readTable<PartnerRecord>('partners') || [];
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

    if (session.role === 'customer') {
      const userRes = await db.query<UserRecord>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR "googleProviderId" = $2 OR "userId" = $3 LIMIT 1',
        [session.email, session.userId, session.userId]
      );
      const userObj = userRes.rows[0] || null;

      return NextResponse.json({
        authenticated: true,
        user: {
          name: userObj ? userObj.name : (session.email ? session.email.split('@')[0] : 'Valued Client'),
          email: session.email,
          phone: userObj ? (userObj.phone || '9876543210') : '9876543210',
          googleProviderId: userObj ? (userObj.googleProviderId || session.userId) : session.userId,
          profileImage: userObj ? (userObj.profileImage || '') : '',
          dob: userObj ? (userObj.dob || '') : '',
          gender: userObj ? (userObj.gender || '') : '',
          wellnessAccessStatus: userObj ? (userObj.wellnessAccessStatus || 'NOT_REQUESTED') : 'NOT_REQUESTED',
          addresses: userObj ? (userObj.addresses || []) : [],
          role: 'customer'
        }
      });
    }

    return NextResponse.json({ authenticated: false, error: 'Invalid session role' }, { status: 401 });
  } catch (err) {
    console.error('Session retrieval error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
