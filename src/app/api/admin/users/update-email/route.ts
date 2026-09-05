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

    const users = await db.readTable<any>('users') || [];
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

    const admins = await db.readTable<any>('admin') || [];
    const emailInUseByAdmin = admins.some((a: any) => a.email.toLowerCase() === newEmail.toLowerCase());

    const partners = await db.readTable<any>('partners') || [];
    const emailInUseByPartner = partners.some((p: any) => p.email.toLowerCase() === newEmail.toLowerCase());

    if (emailInUseByCustomer || emailInUseByAdmin || emailInUseByPartner) {
      return NextResponse.json({ error: 'Email address is already in use by another account.' }, { status: 400 });
    }

    // Update customer email atomically
    customer.email = newEmail.toLowerCase().trim();
    await db.upsertUser(customer);

    // Cascade to orders to ensure cross-view consistency
    try {
      await db.query(
        'UPDATE orders SET "customerId" = $1 WHERE LOWER(TRIM("customerId")) = LOWER(TRIM($2))',
        [newEmail.toLowerCase().trim(), oldEmail.toLowerCase().trim()]
      );
      await db.query(
        'UPDATE orders SET "customerEmail" = $1 WHERE LOWER(TRIM("customerEmail")) = LOWER(TRIM($2))',
        [newEmail.toLowerCase().trim(), oldEmail.toLowerCase().trim()]
      );
    } catch (cascadeErr) {
      console.warn('Cascade email update warning on orders:', cascadeErr);
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
