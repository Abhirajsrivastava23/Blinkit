export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    const session = await validateRole(request, ['delivery_partner', 'admin']);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Delivery Partner or Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, productName, orderId, availableQty, requestedQty, reason } = body;

    if (!productId || !productName || !reason) {
      return NextResponse.json({ error: 'Product ID, Product Name, and Reason are required.' }, { status: 400 });
    }

    // Security: Prevent partner impersonation by overriding partnerId with the verified session userId
    const partnerId = session.role === 'admin' ? (body.partnerId || 'admin') : session.userId;

    const reports = await db.readTable<any>('inventoryIssues') || [];
    const newReport = {
      id: 'iss-' + Math.floor(100000 + Math.random() * 900000),
      productId,
      productName,
      orderId: orderId || 'N/A',
      partnerId,
      availableQty: availableQty !== undefined ? Number(availableQty) : null,
      requestedQty: requestedQty !== undefined ? Number(requestedQty) : 1,
      reason,
      createdAt: new Date().toISOString()
    };

    reports.unshift(newReport);
    await db.writeTable('inventoryIssues', reports);
    db.logActivity('Delivery Partner', 'Reported Stock Issue', productName, `Order: ${orderId}`, `Reason: ${reason}`);

    return NextResponse.json({ success: true, report: newReport });
  } catch (err) {
    console.error('Error submitting inventory issue:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
