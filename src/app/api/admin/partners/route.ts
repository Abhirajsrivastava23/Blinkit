import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole, hashPassword } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// 1. GET: List all partners (Admin only)
export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403, headers: noStoreHeaders });
    }

    const partners = await db.getPartners();
    // Secure passwords by omitting them from responses
    const safePartners = partners.map(({ passwordHash, ...rest }) => rest);

    return NextResponse.json(safePartners, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error listing delivery partners:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noStoreHeaders });
  }
}

// 2. POST: Create or Update partner details (Admin only)
export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403, headers: noStoreHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const { id, name, phone, email, password, locationId, locationName, status, isOnline } = body;

    const cleanId = String(id || '').trim();
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const cleanPassword = password ? String(password).trim() : '';

    if (!cleanId || !cleanName || !cleanEmail) {
      return NextResponse.json({ error: 'ID, Name, and Email are required fields.' }, { status: 400, headers: noStoreHeaders });
    }

    const existingPartner = await db.getPartnerById(cleanId);

    let savedPartner: any;
    if (existingPartner) {
      // Update existing partner
      const updatedData: Record<string, unknown> = {
        id: cleanId,
        name: cleanName,
        phone: cleanPhone !== undefined ? cleanPhone : existingPartner.phone,
        email: cleanEmail,
        locationId: locationId !== undefined ? locationId : existingPartner.locationId,
        locationName: locationName !== undefined ? locationName : existingPartner.locationName,
        status: status !== undefined ? status : existingPartner.status,
        isOnline: isOnline !== undefined ? Boolean(isOnline) : existingPartner.isOnline,
        passwordHash: cleanPassword ? hashPassword(cleanPassword) : (existingPartner.passwordHash || '')
      };

      savedPartner = await db.upsertPartner(updatedData);
      db.logActivity(
        adminSession.email,
        'Updated Partner',
        cleanName,
        `ID: ${cleanId}`,
        `Status: ${savedPartner.status}`
      );
    } else {
      // Create new partner
      if (!cleanPassword) {
        return NextResponse.json({ error: 'Password is required to create a new partner.' }, { status: 400, headers: noStoreHeaders });
      }

      // Check Email uniqueness across existing partners
      const emailPartner = await db.getPartnerById(cleanEmail);
      if (emailPartner && String(emailPartner.id || '').toLowerCase() !== cleanId.toLowerCase()) {
        return NextResponse.json({ error: 'Partner Email already exists.' }, { status: 400, headers: noStoreHeaders });
      }

      const defaultLocName = (locationId === 'chandigarh-university-up')
        ? 'Chandigarh University, Uttar Pradesh'
        : 'Nawabganj, Unnao';

      const newPartnerData: Record<string, unknown> = {
        id: cleanId,
        name: cleanName,
        phone: cleanPhone || '',
        email: cleanEmail,
        passwordHash: hashPassword(cleanPassword),
        role: 'delivery_partner',
        locationId: locationId || 'nawabganj-unnao',
        locationName: locationName || defaultLocName,
        status: status || 'Active',
        isOnline: isOnline !== undefined ? Boolean(isOnline) : false
      };

      savedPartner = await db.upsertPartner(newPartnerData);
      db.logActivity(
        adminSession.email,
        'Created Partner',
        cleanName,
        `ID: ${cleanId}`,
        `Location: ${savedPartner.locationName}`
      );
    }

    // Return the safe partner detail without password hash
    const { passwordHash, ...safeResponse } = savedPartner;
    return NextResponse.json({ success: true, partner: safeResponse }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error saving delivery partner:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noStoreHeaders });
  }
}

// 3. DELETE: Remove partner details (Admin only)
export async function DELETE(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403, headers: noStoreHeaders });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('id');

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID is required.' }, { status: 400, headers: noStoreHeaders });
    }

    const existingPartner = await db.getPartnerById(partnerId);
    if (!existingPartner) {
      return NextResponse.json({ error: 'Partner not found.' }, { status: 404, headers: noStoreHeaders });
    }

    const removedName = String(existingPartner.name || partnerId);
    const targetId = String(existingPartner.id || partnerId);
    
    await db.deletePartner(targetId);

    db.logActivity(
      adminSession.email,
      'Deleted Partner',
      removedName,
      `ID: ${targetId}`,
      'Removed from database'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Delivery partner deleted successfully.' 
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error deleting delivery partner:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noStoreHeaders });
  }
}
