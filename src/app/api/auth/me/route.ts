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

async function resolveWellnessStatus(userObj: any) {
  if (!userObj) return 'NOT_REQUESTED';
  
  if (userObj.wellnessAccessStatus === 'REJECTED') return 'REJECTED';
  if (userObj.wellnessAccessStatus === 'SUSPENDED' || userObj.wellnessAccessStatus === 'REVOKED') return 'SUSPENDED';
  
  if (!userObj.dob) {
    return 'PROFILE_INCOMPLETE';
  }

  const dobDate = new Date(userObj.dob);
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return 'NOT_ELIGIBLE';
  }

  if (userObj.wellnessAccessStatus === 'APPROVED' || userObj.wellnessAccessStatus === 'ACTIVE') {
    const termsRes = await db.query(
      'SELECT * FROM wellness_terms_acceptances WHERE "customerId" = $1 AND "termsVersion" = $2 LIMIT 1',
      [userObj.userId, 'v1']
    );
    return termsRes.rows.length > 0 ? 'ACTIVE' : 'TERMS_REQUIRED';
  }

  return userObj.wellnessAccessStatus || 'NOT_REQUESTED';
}

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    
    // Fetch publication state
    const wellnessSettings = await db.getWellnessSettings();
    const wellnessPublished = Boolean(wellnessSettings.published);

    if (!session) {
      return NextResponse.json({ authenticated: false, wellnessPublished, error: 'Unauthorized session' }, { status: 401, headers: noStoreHeaders });
    }

    if (session.role === 'admin' || session.role === 'super_admin') {
      const admins = await db.readTable<AdminRecord>('admin') || [];
      const adminObj = admins.find(a => a.email && a.email.toLowerCase().trim() === session.email.toLowerCase().trim());
      return NextResponse.json({
        authenticated: true,
        wellnessPublished,
        user: {
          name: adminObj?.name || 'Admin',
          email: adminObj?.email || session.email,
          phone: adminObj?.phone || '',
          role: 'admin'
        }
      }, { headers: noStoreHeaders });
    }

    if (session.role === 'delivery_partner') {
      const partnerObj: any = await db.getPartnerById(session.userId) || await db.getPartnerById(session.email);
      if (!partnerObj) {
        return NextResponse.json({ authenticated: false, wellnessPublished, error: 'Delivery partner record not found' }, { status: 401, headers: noStoreHeaders });
      }
      return NextResponse.json({
        authenticated: true,
        wellnessPublished,
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
      }, { headers: noStoreHeaders });
    }

    if (session.role === 'customer') {
      const userRes = await db.query<UserRecord>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR "googleProviderId" = $2 OR "userId" = $3 LIMIT 1',
        [session.email, session.userId, session.userId]
      );
      const userObj = userRes.rows[0] || null;
      
      const status = await resolveWellnessStatus(userObj);

      return NextResponse.json({
        authenticated: true,
        wellnessPublished,
        user: {
          name: userObj ? userObj.name : (session.email ? session.email.split('@')[0] : 'Customer'),
          email: session.email,
          phone: userObj ? (userObj.phone || session.userId || '') : (session.userId || ''),
          googleProviderId: userObj ? (userObj.googleProviderId || session.userId) : session.userId,
          profileImage: userObj ? (userObj.profileImage || '') : '',
          dob: userObj ? (userObj.dob || '') : '',
          gender: userObj ? (userObj.gender || '') : '',
          wellnessAccessStatus: status,
          addresses: userObj ? (userObj.addresses || []) : [],
          role: 'customer'
        }
      });
    }

    return NextResponse.json({ authenticated: false, wellnessPublished, error: 'Invalid session role' }, { status: 401 });
  } catch (err) {
    console.error('Session retrieval error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
