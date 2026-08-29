import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { getSession } from '../../../data/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const list = await db.readTable<any>('orders') || [];

    if (session.role === 'admin') {
      return NextResponse.json(list);
    }

    if (session.role === 'delivery_partner') {
      // Filter orders assigned to this partner and strip deliveryOtp
      const filtered = list.filter((o: any) => o.assignedPartnerId === session.userId);
      const sanitized = filtered.map((o: any) => {
        const { deliveryOtp, ...rest } = o;
        return rest;
      });
      return NextResponse.json(sanitized);
    }

    if (session.role === 'customer') {
      // Filter orders owned by this customer and mask deliveryOtp if not Out for Delivery or Delivered
      const filtered = list.filter((o: any) => {
        const cId = o.customerId ? o.customerId.toLowerCase() : '';
        const cEmail = o.customerEmail ? o.customerEmail.toLowerCase() : '';
        const sId = session.userId ? session.userId.toLowerCase() : '';
        const sEmail = session.email ? session.email.toLowerCase() : '';
        return (cId === sId || cId === sEmail || cEmail === sEmail);
      });
      const sanitized = filtered.map((o: any) => {
        if (o.status !== 'Out for Delivery' && o.status !== 'Delivered') {
          return { ...o, deliveryOtp: '******' };
        }
        return o;
      });
      return NextResponse.json(sanitized);
    }

    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  } catch (err) {
    console.error('Error reading orders list:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const body = await request.json();
    const orders = await db.readTable<any>('orders') || [];
    
    // Check if order already exists
    const idx = orders.findIndex((o: any) => o.id === body.id);
    if (idx > -1) {
      const prevStatus = orders[idx].status;
      const newStatus = body.status;
      
      // Update history if status changes
      if (newStatus && newStatus !== prevStatus) {
        if (!body.statusHistory) {
          body.statusHistory = orders[idx].statusHistory || [];
        }
        body.statusHistory.push({
          previousStatus: prevStatus,
          newStatus,
          changedByUserId: session.userId || session.email || 'customer',
          changedByRole: session.role,
          timestamp: new Date().toISOString()
        });
      }
      
      orders[idx] = {
        ...orders[idx],
        ...body
      };
    } else {
      // Server-side order creation must require an authenticated customer session
      if (session.role !== 'customer') {
        return NextResponse.json({ error: 'Only authenticated customers can place orders.' }, { status: 403 });
      }

      // Check if order contains wellness items
      const hasWellnessItem = body.items && body.items.some((item: any) => item.category === 'wellness');
      if (hasWellnessItem) {
        const configRes = await db.query("SELECT data FROM config WHERE key = 'wellness_settings'");
        const wellnessPublished = (configRes.rows[0]?.data as any)?.published ?? false;

        if (!wellnessPublished) {
          return NextResponse.json({ error: 'Checkout blocked: Wellness storefront is currently unpublished.' }, { status: 403 });
        }

        const users = await db.readTable<any>('users') || [];
        const userObj = users.find((u: any) => u.userId === session.userId || u.email === session.email);

        if (!userObj) {
          return NextResponse.json({ error: 'Checkout blocked: Customer profile record not found.' }, { status: 403 });
        }

        if (userObj.wellnessAccessStatus !== 'APPROVED' && userObj.wellnessAccessStatus !== 'ACTIVE') {
          return NextResponse.json({ error: 'Checkout blocked: Approved Wellness profile required.' }, { status: 403 });
        }
      }

      // Securely generate OTP on the server for new orders
      const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
      body.deliveryOtp = deliveryOtp;
      body.otpFailedAttempts = 0;
      body.otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      // Force customerId to be the server-side session userId (never trust client)
      body.customerId = session.userId;

      // Initialize status history
      body.statusHistory = [{
        previousStatus: null,
        newStatus: 'Pending',
        changedByUserId: session.userId,
        changedByRole: 'customer',
        timestamp: new Date().toISOString()
      }];
      
      orders.unshift(body);
    }
    
    await db.writeTable('orders', orders);
    return NextResponse.json(body);
  } catch (err) {
    console.error('Error saving order:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
