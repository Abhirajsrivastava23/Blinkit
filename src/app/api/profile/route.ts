import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { getSession } from '../../../data/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized session role' }, { status: 403 });
    }

    const users = await db.readTable<any>('users') || [];
    const customer = users.find(
      (u: any) => u.userId === session.userId || (u.email && u.email.toLowerCase() === session.email.toLowerCase())
    );

    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        dob: customer.dob || '',
        gender: customer.gender || '',
        profileImage: customer.profileImage || '',
        addresses: customer.addresses || [],
        wellnessAccessStatus: customer.wellnessAccessStatus,
        role: 'customer'
      }
    });
  } catch (err) {
    console.error('Error fetching customer profile:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized session role' }, { status: 403 });
    }

    const body = await request.json();
    const users = await db.readTable<any>('users') || [];
    const customerIdx = users.findIndex(
      (u: any) => u.userId === session.userId || (u.email && u.email.toLowerCase() === session.email.toLowerCase())
    );

    if (customerIdx === -1) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const customer = users[customerIdx];

    // 1. Email modification security checks (email is read-only for customer role)
    if (body.email && body.email.toLowerCase() !== customer.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Forbidden: Customers are not allowed to change their own email address.' },
        { status: 403 }
      );
    }

    // 2. Role escalation / privilege escalation checks
    const protectedFields = [
      'role',
      'permissions',
      'accountStatus',
      'wellnessAccessStatus',
      'wellnessRequestId',
      'wellnessApprovedAt',
      'wellnessApprovedBy',
      'googleProviderId',
      'userId',
      'createdAt',
      'lastLoginAt'
    ];

    for (const field of protectedFields) {
      if (body[field] !== undefined && body[field] !== customer[field]) {
        return NextResponse.json(
          { error: `Forbidden: Modification of protected field '${field}' is not allowed.` },
          { status: 403 }
        );
      }
    }

    // 3. Update permitted profile fields
    if (body.name !== undefined) customer.name = body.name;
    if (body.phone !== undefined) customer.phone = body.phone;
    if (body.dob !== undefined) customer.dob = body.dob;
    if (body.gender !== undefined) customer.gender = body.gender;
    if (body.profileImage !== undefined) customer.profileImage = body.profileImage;
    if (body.addresses !== undefined) customer.addresses = body.addresses;

    await db.writeTable('users', users);

    return NextResponse.json({
      success: true,
      user: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        dob: customer.dob || '',
        gender: customer.gender || '',
        profileImage: customer.profileImage || '',
        addresses: customer.addresses || [],
        wellnessAccessStatus: customer.wellnessAccessStatus,
        role: 'customer'
      }
    });
  } catch (err) {
    console.error('Error updating customer profile:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function PATCH(request: Request) {
  return POST(request);
}

