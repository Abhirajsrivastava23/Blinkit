import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { hashPassword, createSession } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
      console.error('Configuration Error: AUTH_SECRET is not configured on the server.');
      return NextResponse.json(
        { error: 'Server configuration error: AUTH_SECRET is missing.' },
        { status: 500 }
      );
    }

    const { emailOrId, password } = await request.json();

    if (!emailOrId || !password) {
      return NextResponse.json({ error: 'Email/ID and password are required' }, { status: 400 });
    }

    const hashedInput = hashPassword(password);

    // 1. Check Admin Account (only one admin configuration exists in admin.json)
    const admins = db.readTable<any>('admin') || [];
    const adminObj = admins.find(a => a.email.toLowerCase() === emailOrId.toLowerCase().trim());
    if (adminObj) {
      if (adminObj.passwordHash === hashedInput) {
        const session = createSession(adminObj.email, adminObj.email, 'admin');
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
    const partners = db.readTable<any>('partners') || [];
    const partnerObj = partners.find(
      p => p.id.toLowerCase() === emailOrId.toLowerCase().trim() ||
           p.email.toLowerCase() === emailOrId.toLowerCase().trim()
    );

    if (partnerObj) {
      if (partnerObj.status !== 'Active') {
        return NextResponse.json({ error: 'Your delivery partner account is currently inactive. Contact admin.' }, { status: 403 });
      }

      if (partnerObj.passwordHash === hashedInput) {
        const session = createSession(partnerObj.id, partnerObj.email, 'delivery_partner');
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
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  } catch (err) {
    console.error('Error in auth login endpoint:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
