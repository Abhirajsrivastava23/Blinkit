import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const body = await request.json();
    const { id, updates } = body;
    
    if (!id || !updates) {
      return NextResponse.json({ error: 'Order id and updates are required' }, { status: 400 });
    }

    const orders = db.readTable<any>('orders') || [];
    const idx = orders.findIndex((o: any) => o.id === id);
    
    if (idx === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const targetOrder = orders[idx];

    // Transition verification constraints (applies to both Partner and Admin status changes)
    if (updates.status && updates.status !== targetOrder.status) {
      const currentStatus = targetOrder.status;
      const targetStatus = updates.status;

      const validTransitions: Record<string, string[]> = {
        'Pending': ['Confirmed', 'Cancelled'],
        'Confirmed': ['Preparing', 'Cancelled'],
        'Preparing': ['Packed', 'Cancelled'],
        'Packed': ['Ready for Delivery', 'Cancelled'],
        'Ready for Delivery': ['Waiting for Partner', 'Cancelled'],
        'Waiting for Partner': ['Assigned', 'Cancelled'],
        'Assigned': ['Accepted', 'Cancelled'],
        'Accepted': ['Picked Up', 'Cancelled'],
        'Picked Up': ['Out for Delivery', 'Cancelled'],
        'Out for Delivery': ['Delivered', 'Cancelled']
      };

      const allowedNext = validTransitions[currentStatus] || [];
      if (session.role === 'delivery_partner') {
        if (!allowedNext.includes(targetStatus)) {
          return NextResponse.json({ 
            error: `Invalid transition: Cannot progress order from ${currentStatus} to ${targetStatus}` 
          }, { status: 400 });
        }
      }
    }

    // Enforce role checks and status progression security
    if (session.role === 'delivery_partner') {
      // 1. Is it assigned to this partner?
      if (targetOrder.assignedPartnerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden: You cannot modify orders assigned to other partners.' }, { status: 403 });
      }

      // 2. Limit what fields can be updated
      const allowedKeys = ['status', 'failedReason', 'failedComment', 'arrivedNotify', 'otpVerified', 'verifiedItemIds', 'boxSealVerified', 'otpCode', 'otpInput'];
      const updateKeys = Object.keys(updates);
      const isKeysAllowed = updateKeys.every(k => allowedKeys.includes(k));
      if (!isKeysAllowed) {
        return NextResponse.json({ error: 'Forbidden: Delivery partners can only modify delivery operations status fields.' }, { status: 403 });
      }

      // 3. Limit what statuses can be set
      const allowedStatuses = ['Accepted', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed Delivery', 'Cancelled'];
      if (updates.status && !allowedStatuses.includes(updates.status)) {
        return NextResponse.json({ error: `Forbidden: Delivery partners cannot transition order to status: ${updates.status}` }, { status: 403 });
      }

      // 4. Pickup verification validations
      if (updates.status === 'Picked Up') {
        const validPickupStatuses = ['Accepted', 'Pending', 'Confirmed', 'Preparing', 'Packed'];
        if (!validPickupStatuses.includes(targetOrder.status)) {
          return NextResponse.json({ error: 'Order status has changed. Refresh and try again.' }, { status: 400 });
        }

        const requiredItemIds = targetOrder.items.map((item: any) => item.productId);
        const verifiedItemIds = updates.verifiedItemIds || [];
        const allItemsVerified = requiredItemIds.every((id: string) => verifiedItemIds.includes(id));
        if (!allItemsVerified) {
          return NextResponse.json({ error: 'All items must be verified before pickup.' }, { status: 400 });
        }

        if (updates.boxSealVerified !== true) {
          return NextResponse.json({ error: 'Please verify the package seal.' }, { status: 400 });
        }

        // Add additional server-derived metadata
        updates.pickupTimestamp = new Date().toISOString();
        updates.pickupPartnerId = session.userId;
        updates.pickupVerificationStatus = 'Verified';
      }

      // 5. OTP verification validations for DELIVERED status
      if (updates.status === 'Delivered') {
        if (targetOrder.status !== 'Out for Delivery') {
          return NextResponse.json({ error: 'Order status has changed. Refresh and try again.' }, { status: 400 });
        }

        const failedAttempts = targetOrder.otpFailedAttempts || 0;
        if (failedAttempts >= 5) {
          return NextResponse.json({ error: 'Too many incorrect attempts. Please contact support/admin.' }, { status: 429 });
        }

        const clientOtp = updates.otpCode || updates.otpInput;
        if (!clientOtp) {
          return NextResponse.json({ error: 'Delivery OTP is required for completion.' }, { status: 400 });
        }

        if (clientOtp !== targetOrder.deliveryOtp) {
          // Increment failed attempts and save immediately
          orders[idx].otpFailedAttempts = failedAttempts + 1;
          db.writeTable('orders', orders);
          return NextResponse.json({ 
            error: 'Incorrect OTP. Please ask the customer to confirm the delivery OTP.' 
          }, { status: 400 });
        }

        // Check OTP expiration
        const expiresAt = targetOrder.otpExpiresAt ? new Date(targetOrder.otpExpiresAt) : new Date(new Date(targetOrder.createdAt).getTime() + 24 * 60 * 60 * 1000);
        if (new Date() > expiresAt) {
          return NextResponse.json({ error: 'OTP has expired. Please ask the customer to regenerate a new OTP.' }, { status: 400 });
        }

        // OTP verified successfully
        updates.delivery_otp_verified = true;
        updates.otp_verified_at = new Date().toISOString();
        updates.verified_by_partner_id = session.userId;
        updates.delivery_completed_at = new Date().toISOString();
        updates.otpFailedAttempts = 0;
      }
    } else if (session.role === 'admin') {
      // Admin overrides
      if (updates.status === 'Delivered' && !targetOrder.delivery_otp_verified) {
        const reason = updates.adminOverrideReason;
        if (!reason) {
          return NextResponse.json({ error: 'Admin override requires a reason.' }, { status: 400 });
        }

        updates.delivery_otp_verified = true;
        updates.otp_verified_at = new Date().toISOString();
        updates.verified_by_partner_id = 'ADMIN_OVERRIDE';
        updates.delivery_completed_at = new Date().toISOString();
        updates.otpFailedAttempts = 0;
        updates.adminOverride = {
          adminId: session.userId || session.email,
          reason,
          timestamp: new Date().toISOString()
        };

        db.logActivity(
          session.email, 
          `Overrode Delivery Verification for Order #${targetOrder.id}`, 
          targetOrder.id, 
          targetOrder.status, 
          'Delivered'
        );
      }
    } else {
      // Non-partner/non-admin users cannot update order statuses via this endpoint
      return NextResponse.json({ error: 'Forbidden: Unauthorized role' }, { status: 403 });
    }

    // Append Status transitions History
    const prevStatus = targetOrder.status;
    const newStatus = updates.status;
    if (newStatus && newStatus !== prevStatus) {
      if (!targetOrder.statusHistory) {
        targetOrder.statusHistory = [];
      }
      targetOrder.statusHistory.push({
        previousStatus: prevStatus,
        newStatus,
        changedByUserId: session.userId || session.email,
        changedByRole: session.role,
        timestamp: new Date().toISOString()
      });
      updates.statusHistory = targetOrder.statusHistory;
    }
    
    orders[idx] = {
      ...targetOrder,
      ...updates
    };
    
    db.writeTable('orders', orders);
    return NextResponse.json({ success: true, order: orders[idx] });
  } catch (err) {
    console.error('Error updating order on server:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
