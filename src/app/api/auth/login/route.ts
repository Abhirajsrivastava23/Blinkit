import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { verifyPassword, createSession } from '../../../../data/auth';

// Trigger route reload
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { emailOrId, password } = await request.json();

    if (!emailOrId || !password) {
      return NextResponse.json({ error: 'Email/ID and password are required' }, { status: 400 });
    }

    const cleanInput = String(emailOrId).trim().toLowerCase();

    // 1. Check Admin Account (admin.json)
    const admins = await db.readTable<any>('admin') || [];
    const adminObj = admins.find(a => (a.email && a.email.toLowerCase().trim() === cleanInput));
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

    // 2. Check Delivery Partner Accounts
    const partners = await db.readTable<any>('partners') || [];
    const partnerObj = partners.find(
      p => (p.id && p.id.toLowerCase().trim() === cleanInput) ||
           (p.email && p.email.toLowerCase().trim() === cleanInput) ||
           (p.phone && p.phone.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
    );

    if (partnerObj) {
      if (partnerObj.status !== 'Active') {
        return NextResponse.json({ error: 'Your delivery partner account is currently inactive. Contact admin.' }, { status: 403 });
      }

      if (verifyPassword(password, partnerObj.passwordHash)) {
        const session = await createSession(partnerObj.id, partnerObj.email, 'delivery_partner');
        const response = NextResponse.json({
          success: true,
          user: {
            name: partnerObj.name,
            email: partnerObj.email,
            phone: partnerObj.phone,
            role: 'delivery_partner',
            deliveryPartnerId: partnerObj.id,
            locationId: partnerObj.locationId,
            locationName: partnerObj.locationName
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
