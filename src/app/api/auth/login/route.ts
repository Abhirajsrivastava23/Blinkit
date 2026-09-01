import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { verifyPassword, createSession } from '../../../../data/auth';
import partnersJson from '../../../../data/db/partners.json';
import adminJson from '../../../../data/db/admin.json';

// Trigger route reload
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { emailOrId, password } = await request.json();

    if (!emailOrId || !password) {
      return NextResponse.json({ error: 'Email/ID and password are required' }, { status: 400 });
    }

    const cleanInput = String(emailOrId).trim().toLowerCase();

    // 1. Check Admin Account (admin table + admin.json fallback)
    const admins = await db.readTable<any>('admin') || [];
    let adminObj = admins.find(a => (a.email && a.email.toLowerCase().trim() === cleanInput));
    if (!adminObj) {
      adminObj = (adminJson as any[]).find((a: any) => a.email && a.email.toLowerCase().trim() === cleanInput);
    }
    if (adminObj) {
      if (verifyPassword(password, adminObj.passwordHash)) {
        const session = await createSession(adminObj.email, adminObj.email, 'admin');
        const response = NextResponse.json({
          success: true,
          user: {
            name: adminObj.name,
            email: adminObj.email,
            phone: adminObj.phone,
            role: 'admin'
          }
        });

        // Set Cookie
        response.cookies.set('fatafat_session_token', session.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return response;
      } else {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    // 2. Check Delivery Partner Accounts (DB + Seed)
    const partners = await db.readTable<any>('partners') || [];
    const cleanDigits = cleanInput.replace(/\D/g, '');

    let partnerObj = partners.find(p => {
      const pId = String(p.id || p.ID || '').trim().toLowerCase();
      const pEmail = String(p.email || '').trim().toLowerCase();
      const pPhone = String(p.phone || '').replace(/\D/g, '');
      return (
        (pId && pId === cleanInput) ||
        (pEmail && pEmail === cleanInput) ||
        (pPhone && cleanDigits && pPhone === cleanDigits)
      );
    });

    if (!partnerObj) {
      partnerObj = (partnersJson as any[]).find((p: any) => {
        const pId = String(p.id || '').trim().toLowerCase();
        const pEmail = String(p.email || '').trim().toLowerCase();
        const pPhone = String(p.phone || '').replace(/\D/g, '');
        return (
          (pId && pId === cleanInput) ||
          (pEmail && pEmail === cleanInput) ||
          (pPhone && cleanDigits && pPhone === cleanDigits)
        );
      });
    }

    if (partnerObj) {
      const partnerStatus = String(partnerObj.status || 'Active').trim().toLowerCase();
      if (partnerStatus === 'inactive') {
        return NextResponse.json({ error: 'Your delivery partner account is currently inactive. Contact admin.' }, { status: 403 });
      }

      const storedHash = String(
        partnerObj.passwordHash ||
        partnerObj.passwordhash ||
        partnerObj.password_hash ||
        ''
      ).trim();

      if (verifyPassword(password, storedHash)) {
        const partnerId = partnerObj.id || partnerObj.ID || 'DP-001';
        const partnerEmail = partnerObj.email || `${partnerId.toLowerCase()}@fatafat.com`;
        const session = await createSession(partnerId, partnerEmail, 'delivery_partner');

        const response = NextResponse.json({
          success: true,
          user: {
            name: partnerObj.name || 'Delivery Partner',
            email: partnerEmail,
            phone: partnerObj.phone || '',
            role: 'delivery_partner',
            deliveryPartnerId: partnerId,
            locationId: partnerObj.locationId || partnerObj.locationid || 'nawabganj-unnao',
            locationName: partnerObj.locationName || partnerObj.locationname || 'Nawabganj, Unnao'
          }
        });

        // Set Cookie
        response.cookies.set('fatafat_session_token', session.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return response;
      } else {
        return NextResponse.json({ error: 'Invalid ID/Email or password' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Invalid ID/Email or password' }, { status: 401 });
  } catch (err) {
    console.error('Error in auth login endpoint:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
