import { NextResponse } from 'next/server';
import { db } from '../../../../../data/db';
import { getSession } from '../../../../../data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { userId, newEmail } = await request.json();

    if (!userId || !newEmail) {
      return NextResponse.json({ error: 'userId and newEmail parameters are required.' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email address format.' }, { status: 400 });
    }

    const users = db.readTable<any>('users') || [];
    const customerIdx = users.findIndex((u: any) => u.userId === userId);

    if (customerIdx === -1) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    const customer = users[customerIdx];
    const oldEmail = customer.email;

    // Check if new email is already in use
    const emailInUseByCustomer = users.some(
      (u: any) => u.email.toLowerCase() === newEmail.toLowerCase() && u.userId !== userId
    );

    const admins = db.readTable<any>('admin') || [];
    const emailInUseByAdmin = admins.some((a: any) => a.email.toLowerCase() === newEmail.toLowerCase());

    const partners = db.readTable<any>('partners') || [];
    const emailInUseByPartner = partners.some((p: any) => p.email.toLowerCase() === newEmail.toLowerCase());

    if (emailInUseByCustomer || emailInUseByAdmin || emailInUseByPartner) {
      return NextResponse.json({ error: 'Email address is already in use by another account.' }, { status: 400 });
    }

    // Update customer email
    customer.email = newEmail.toLowerCase().trim();
    db.writeTable('users', users);

    // Cascade to orders.json to ensure data consistency
    const orders = db.readTable<any>('orders') || [];
    let ordersUpdated = false;
    for (const order of orders) {
      if (order.customerId && order.customerId.toLowerCase() === oldEmail.toLowerCase()) {
        order.customerId = newEmail.toLowerCase().trim();
        ordersUpdated = true;
      }
      if (order.customerEmail && order.customerEmail.toLowerCase() === oldEmail.toLowerCase()) {
        order.customerEmail = newEmail.toLowerCase().trim();
        ordersUpdated = true;
      }
    }
    if (ordersUpdated) {
      db.writeTable('orders', orders);
    }

    return NextResponse.json({
      success: true,
      message: `Email updated from ${oldEmail} to ${newEmail} successfully.`,
      user: {
        userId: customer.userId,
        name: customer.name,
        email: customer.email
      }
    });
  } catch (err) {
    console.error('Error updating customer email from admin API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
