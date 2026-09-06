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
    // Secure passwords by omitting all hash fields from responses
    const safePartners = partners.map(p => {
      const clean = { ...p };
      delete clean.passwordHash;
      delete clean.passwordhash;
      delete clean.password_hash;
      return clean;
    });

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
    const { id, name, phone, email, password, locationId, locationName, status, isOnline, isEdit } = body;

    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const cleanPassword = password ? String(password).trim() : '';

    if (!cleanName || !cleanEmail) {
      return NextResponse.json({ error: 'Full Name and Email Address are required fields.' }, { status: 400, headers: noStoreHeaders });
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400, headers: noStoreHeaders });
    }

    // Determine target ID
    let cleanId = String(id || '').trim();
    if (!cleanId) {
      const allPartners = await db.getPartners();
      let maxNum = 0;
      for (const p of allPartners) {
        const match = String(p.id || '').match(/DP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      cleanId = `DP-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const existingById = await db.getPartnerById(cleanId);
    const existingByEmail = await db.getPartnerById(cleanEmail);

    let savedPartner: Record<string, unknown>;

    if (isEdit || (existingById && existingByEmail && String(existingByEmail.id).toLowerCase() === cleanId.toLowerCase())) {
      // --- UPDATE EXISTING PARTNER ---
      if (!existingById) {
        return NextResponse.json({ error: `Partner with ID ${cleanId} not found to edit.` }, { status: 404, headers: noStoreHeaders });
      }

      if (existingByEmail && String(existingByEmail.id || '').toLowerCase() !== cleanId.toLowerCase()) {
        return NextResponse.json({ error: 'Another delivery partner with this email address already exists.' }, { status: 400, headers: noStoreHeaders });
      }

      const defaultLocName = (locationId === 'chandigarh-university-up')
        ? 'Chandigarh University, Uttar Pradesh'
        : 'Nawabganj, Unnao';

      const updatedData: Record<string, unknown> = {
        id: cleanId,
        name: cleanName,
        phone: cleanPhone !== undefined ? cleanPhone : existingById.phone,
        email: cleanEmail,
        locationId: locationId || existingById.locationId || 'nawabganj-unnao',
        locationName: locationName || existingById.locationName || defaultLocName,
        status: status !== undefined ? status : existingById.status,
        isOnline: isOnline !== undefined ? Boolean(isOnline) : existingById.isOnline,
        passwordHash: cleanPassword ? hashPassword(cleanPassword) : (existingById.passwordHash || existingById.passwordhash || '')
      };

      savedPartner = await db.upsertPartner(updatedData);
      db.logActivity(
        adminSession.email,
        'Updated Partner',
        cleanName,
        `ID: ${cleanId}`,
        `Status: ${savedPartner.status}`
      ).catch(() => {});
    } else {
      // --- CREATE NEW PARTNER ---
      if (!cleanPassword) {
        return NextResponse.json({ error: 'Password is required to create a new delivery partner.' }, { status: 400, headers: noStoreHeaders });
      }

      if (existingByEmail) {
        return NextResponse.json({ error: 'A delivery partner with this email address already exists.' }, { status: 400, headers: noStoreHeaders });
      }

      // If ID already taken by a different partner, auto-generate next unused ID
      if (existingById) {
        const allPartners = await db.getPartners();
        let maxNum = 0;
        for (const p of allPartners) {
          const match = String(p.id || '').match(/DP-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        cleanId = `DP-${String(maxNum + 1).padStart(3, '0')}`;
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
      ).catch(() => {});
    }

    // Return the safe partner detail without password hash
    const safeResponse = { ...savedPartner };
    delete safeResponse.passwordHash;
    delete safeResponse.passwordhash;
    delete safeResponse.password_hash;

    return NextResponse.json({ 
      success: true, 
      message: 'Delivery partner saved successfully.', 
      partner: safeResponse 
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error saving delivery partner:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error saving delivery partner.' }, { status: 500, headers: noStoreHeaders });
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
    ).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      message: 'Delivery partner deleted successfully.' 
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error deleting delivery partner:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: noStoreHeaders });
  }
}
