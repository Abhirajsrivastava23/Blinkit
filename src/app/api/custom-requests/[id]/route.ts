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
    const params = await props.params;
    const cleanId = decodeURIComponent(params.id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const customRequest = await db.getCustomRequestById(cleanId);
    if (!customRequest) {
      return NextResponse.json({ error: 'Custom request not found.' }, { status: 404 });
    }

    const session = await getSession(request);

    // If customer is logged in, verify ownership unless admin
    if (session && session.role === 'customer') {
      let userPhone = '';
      if (session.userId) {
        const userRec = await db.getUserById(session.userId);
        if (userRec && userRec['phone']) userPhone = String(userRec['phone']);
      }

      const isOwner = 
        session.userId === customRequest.customerId ||
        (session.email && session.email.toLowerCase() === customRequest.email.toLowerCase()) ||
        (userPhone && userPhone === customRequest.mobile);

      if (!isOwner) {
        return NextResponse.json({ error: 'Unauthorized: Access to this custom request is restricted.' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      customRequest
    });
  } catch (err) {
    console.error('Error fetching custom request by ID:', err);
    return NextResponse.json({ error: 'Failed to retrieve custom request.' }, { status: 500 });
  }
}
