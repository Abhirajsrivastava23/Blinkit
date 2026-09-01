import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole, hashPassword } from '../../../../data/auth';

// 1. GET: List all partners (Admin only)
export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const partners = await db.readTable<any>('partners') || [];
    // Secure passwords by omitting them from responses
    const safePartners = partners.map(({ passwordHash, ...rest }) => rest);

    return NextResponse.json(safePartners);
  } catch (err) {
    console.error('Error listing delivery partners:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 2. POST: Create or Update partner details (Admin only)
export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, phone, email, password, locationId, locationName, status, isOnline } = body;

    const cleanId = String(id).trim();
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanPassword = password ? String(password).trim() : '';

    if (!cleanId || !cleanName || !cleanEmail) {
      return NextResponse.json({ error: 'ID, Name, and Email are required fields.' }, { status: 400 });
    }

    const partners = await db.readTable<any>('partners') || [];
    const idx = partners.findIndex(p => p.id && p.id.toLowerCase().trim() === cleanId.toLowerCase());

    let savedPartner: any;
    if (idx > -1) {
      // Update existing partner
      const prevPartner = partners[idx];
      savedPartner = {
        ...prevPartner,
        name: cleanName,
        phone: cleanPhone !== undefined ? cleanPhone : prevPartner.phone,
        email: cleanEmail,
        locationId: locationId !== undefined ? locationId : prevPartner.locationId,
        locationName: locationName !== undefined ? locationName : prevPartner.locationName,
        status: status !== undefined ? status : prevPartner.status,
        isOnline: isOnline !== undefined ? isOnline : prevPartner.isOnline
      };

      // Optional: password reset
      if (cleanPassword) {
        savedPartner.passwordHash = hashPassword(cleanPassword);
      }

      partners[idx] = savedPartner;
      db.logActivity('Admin Console', 'Updated Partner', cleanName, `ID: ${cleanId}`, `Status: ${savedPartner.status}`);
    } else {
      // Create new partner
      if (!cleanPassword) {
        return NextResponse.json({ error: 'Password is required to create a new partner.' }, { status: 400 });
      }

      // Check ID/email uniqueness
      const idExists = partners.some(p => p.id && p.id.toLowerCase().trim() === cleanId.toLowerCase());
      const emailExists = partners.some(p => p.email && p.email.toLowerCase().trim() === cleanEmail);

      if (idExists) {
        return NextResponse.json({ error: 'Partner ID already exists.' }, { status: 400 });
      }
      if (emailExists) {
        return NextResponse.json({ error: 'Partner Email already exists.' }, { status: 400 });
      }

      savedPartner = {
        id: cleanId,
        name: cleanName,
        phone: cleanPhone || '',
        email: cleanEmail,
        passwordHash: hashPassword(cleanPassword),
        role: 'delivery_partner',
        locationId: locationId || 'nawabganj-unnao',
        locationName: locationName || 'Nawabganj, Unnao',
        status: status || 'Active',
        isOnline: isOnline !== undefined ? isOnline : false
      };

      partners.push(savedPartner);
      db.logActivity('Admin Console', 'Created Partner', cleanName, `ID: ${cleanId}`, `Location: ${savedPartner.locationName}`);
    }

    await db.writeTable('partners', partners);

    // Return the safe partner detail without password hash
    const { passwordHash, ...safeResponse } = savedPartner;
    return NextResponse.json({ success: true, partner: safeResponse });
  } catch (err) {
    console.error('Error saving delivery partner:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 3. DELETE: Remove partner details (Admin only)
export async function DELETE(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('id');

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID is required.' }, { status: 400 });
    }

    const partners = await db.readTable<any>('partners') || [];
    const idx = partners.findIndex(p => p.id.toLowerCase() === partnerId.toLowerCase());

    if (idx === -1) {
      return NextResponse.json({ error: 'Partner not found.' }, { status: 404 });
    }

    const removedName = partners[idx].name;
    partners.splice(idx, 1);
    await db.writeTable('partners', partners);

    db.logActivity('Admin Console', 'Deleted Partner', removedName, `ID: ${partnerId}`, 'Removed from database');

    return NextResponse.json({ success: true, message: 'Delivery partner deleted successfully.' });
  } catch (err) {
    console.error('Error deleting delivery partner:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
