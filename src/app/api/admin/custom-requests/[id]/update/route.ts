import { NextResponse } from 'next/server';
import { db, CustomRequestRecord } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const params = await props.params;
    const cleanId = decodeURIComponent(params.id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const existing = await db.getCustomRequestById(cleanId);
    if (!existing) {
      return NextResponse.json({ error: `Custom request ${cleanId} not found.` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const updates: Partial<CustomRequestRecord> = {};

    if (body.status) {
      updates.status = body.status;
    }
    if (body.adminNotes !== undefined) {
      updates.adminNotes = String(body.adminNotes).trim();
    }
    if (body.quotedAmount !== undefined && body.quotedAmount !== null) {
      const parsedAmount = Number(body.quotedAmount);
      if (!isNaN(parsedAmount) && parsedAmount >= 0) {
        updates.quotedAmount = parsedAmount;
        // If quoted amount is set and status was still "Request Submitted" or "Under Review", elevate to "Available / Quote Ready"
        if (!body.status && (existing.status === 'Request Submitted' || existing.status === 'Under Review')) {
          updates.status = 'Available / Quote Ready';
        }
      }
    }
    if (body.productName !== undefined) {
      updates.productName = String(body.productName).trim();
    }
    if (body.requestedDetails !== undefined) {
      updates.requestedDetails = String(body.requestedDetails).trim();
    }
    if (body.paymentStatus !== undefined) {
      updates.paymentStatus = body.paymentStatus;
    }

    const updated = await db.updateCustomRequest(cleanId, updates);

    // Log admin activity
    db.logActivity(
      adminSession.email || 'Admin',
      'CUSTOM_REQUEST_UPDATE',
      `Custom Request #${cleanId}`,
      JSON.stringify(existing.status),
      JSON.stringify(updated?.status)
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Custom request #${cleanId} updated successfully.`,
      customRequest: updated
    });
  } catch (err) {
    console.error('Error updating custom request:', err);
    return NextResponse.json({ error: 'Failed to update custom request.' }, { status: 500 });
  }
}
