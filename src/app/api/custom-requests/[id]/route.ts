import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Session required to view custom request details.' },
        { status: 401 }
      );
    }

    const params = await props.params;
    const cleanId = decodeURIComponent(params.id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const customRequest = await db.getCustomRequestById(cleanId);
    if (!customRequest) {
      return NextResponse.json({ error: 'Custom request not found.' }, { status: 404 });
    }

    // Role-based authorization
    if (session.role === 'admin' || session.role === 'super_admin') {
      return NextResponse.json({
        success: true,
        customRequest
      });
    } else if (session.role === 'customer') {
      let userPhone = '';
      if (session.userId) {
        const userRec = await db.getUserById(session.userId);
        if (userRec && userRec['phone']) userPhone = String(userRec['phone']);
      }

      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();
      const reqCustId = String(customRequest.customerId || '').toLowerCase().trim();
      const reqEmail = String(customRequest.email || '').toLowerCase().trim();

      const isOwner = 
        (reqCustId && (reqCustId === sId || reqCustId === sEmail)) ||
        (reqEmail && (reqEmail === sEmail || reqEmail === sId)) ||
        (userPhone && customRequest.mobile && userPhone === customRequest.mobile);

      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden: Access to this custom request is restricted.' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        customRequest
      });
    }

    return NextResponse.json({ error: 'Forbidden: Unauthorized session role.' }, { status: 403 });
  } catch (err) {
    console.error('Error fetching custom request by ID:', err);
    return NextResponse.json({ error: 'Failed to retrieve custom request.' }, { status: 500 });
  }
}

