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
    
    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Order id and updates are required' }, { status: 400 });
    }

    const cleanId = String(id).trim();
    const targetOrder = await db.getOrderById(cleanId);
    
    if (!targetOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatesToPersist: Record<string, unknown> = { ...updates };

    // Transition verification constraints (applies to both Partner and Admin status changes)
    if (updates.status && updates.status !== targetOrder.status) {
      const currentStatus = String(targetOrder.status);
      const targetStatus = String(updates.status);

      const validTransitions: Record<string, string[]> = {
        'Pending': ['Confirmed', 'Cancelled'],
        'Confirmed': ['Preparing', 'Cancelled'],
        'Preparing': ['Packed', 'Cancelled'],
        'Packed': ['Ready for Delivery', 'Waiting for Partner', 'Assigned', 'Cancelled'],
        'Ready for Delivery': ['Waiting for Partner', 'Assigned', 'Cancelled'],
        'Waiting for Partner': ['Assigned', 'Cancelled'],
        'Assigned': ['Accepted', 'Waiting for Partner', 'Cancelled'],
        'Accepted': ['Picked Up', 'Waiting for Partner', 'Cancelled'],
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
      const assignedId = String(targetOrder.assignedPartnerId || '').toLowerCase();
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();

      if (!assignedId || (assignedId !== sId && assignedId !== sEmail)) {
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
        const validPickupStatuses = ['Accepted', 'Assigned', 'Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready for Delivery', 'Waiting for Partner'];
        if (!validPickupStatuses.includes(String(targetOrder.status))) {
          return NextResponse.json({ error: 'Order status has changed. Refresh and try again.' }, { status: 400 });
        }

        const itemsList = Array.isArray(targetOrder.items) ? targetOrder.items : [];
        const requiredItemIds = itemsList.map((item: any) => item.productId);
        const verifiedItemIds = updates.verifiedItemIds || [];
        const allItemsVerified = requiredItemIds.every((prodId: string) => verifiedItemIds.includes(prodId));
        if (!allItemsVerified) {
          return NextResponse.json({ error: 'All items must be verified before pickup.' }, { status: 400 });
        }

        if (updates.boxSealVerified !== true) {
          return NextResponse.json({ error: 'Please verify the package seal.' }, { status: 400 });
        }

        // Add additional server-derived metadata
        updatesToPersist.pickupTimestamp = new Date().toISOString();
        updatesToPersist.pickupPartnerId = session.userId;
        updatesToPersist.pickupVerificationStatus = 'Verified';
      }

      // 5. OTP verification validations for DELIVERED status
      if (updates.status === 'Delivered') {
        if (targetOrder.status !== 'Out for Delivery') {
          return NextResponse.json({ error: 'Order status has changed. Refresh and try again.' }, { status: 400 });
        }

        const failedAttempts = Number(targetOrder.otpFailedAttempts || 0);
        if (failedAttempts >= 5) {
          return NextResponse.json({ error: 'Too many incorrect attempts. Please contact support/admin.' }, { status: 429 });
        }

        const clientOtp = updates.otpCode || updates.otpInput;
        if (!clientOtp) {
          return NextResponse.json({ error: 'Delivery OTP is required for completion.' }, { status: 400 });
        }

        if (String(clientOtp).trim() !== String(targetOrder.deliveryOtp).trim()) {
          // Increment failed attempts and save immediately
          await db.updateOrder(cleanId, { otpFailedAttempts: failedAttempts + 1 });
          return NextResponse.json({ 
            error: 'Incorrect OTP. Please ask the customer to confirm the delivery OTP.' 
          }, { status: 400 });
        }

        // Check OTP expiration
        const expiresAt = targetOrder.otpExpiresAt 
          ? new Date(String(targetOrder.otpExpiresAt)) 
          : new Date(new Date(String(targetOrder.createdAt)).getTime() + 24 * 60 * 60 * 1000);
        
        if (new Date() > expiresAt) {
          return NextResponse.json({ error: 'OTP has expired. Please ask the customer to regenerate a new OTP.' }, { status: 400 });
        }

        // OTP verified successfully
        updatesToPersist.delivery_otp_verified = true;
        updatesToPersist.otp_verified_at = new Date().toISOString();
        updatesToPersist.verified_by_partner_id = session.userId;
        updatesToPersist.delivery_completed_at = new Date().toISOString();
        updatesToPersist.otpFailedAttempts = 0;
      }
    } else if (session.role === 'admin') {
      // Admin overrides
      if (updates.status === 'Delivered' && !targetOrder.delivery_otp_verified) {
        const reason = updates.adminOverrideReason;
        if (!reason) {
          return NextResponse.json({ error: 'Admin override requires a reason.' }, { status: 400 });
        }

        updatesToPersist.delivery_otp_verified = true;
        updatesToPersist.otp_verified_at = new Date().toISOString();
        updatesToPersist.verified_by_partner_id = 'ADMIN_OVERRIDE';
        updatesToPersist.delivery_completed_at = new Date().toISOString();
        updatesToPersist.otpFailedAttempts = 0;
        updatesToPersist.adminOverride = {
          adminId: session.userId || session.email,
          reason,
          timestamp: new Date().toISOString()
        };

        db.logActivity(
          session.email, 
          `Overrode Delivery Verification for Order #${targetOrder.id}`, 
          String(targetOrder.id), 
          String(targetOrder.status), 
          'Delivered'
        );
      }

      // Admin partner assignment change handling
      if (updates.assignedPartnerId !== undefined) {
        if (updates.assignedPartnerId) {
          updatesToPersist.assignedPartnerId = String(updates.assignedPartnerId).trim();
          updatesToPersist.assignedPartnerName = updates.assignedPartnerName || targetOrder.assignedPartnerName || 'Delivery Partner';
          updatesToPersist.assignedAt = updates.assignedAt || new Date().toISOString();
          if (!updates.status && (targetOrder.status === 'Pending' || targetOrder.status === 'Confirmed' || targetOrder.status === 'Preparing' || targetOrder.status === 'Packed' || targetOrder.status === 'Ready for Delivery' || targetOrder.status === 'Waiting for Partner')) {
            updatesToPersist.status = 'Assigned';
          }
          db.logActivity(
            session.email,
            `Assigned Partner for Order #${targetOrder.id}`,
            String(targetOrder.id),
            String(targetOrder.assignedPartnerName || 'Unassigned'),
            String(updatesToPersist.assignedPartnerName)
          );
        } else {
          // Unassigned
          updatesToPersist.assignedPartnerId = null;
          updatesToPersist.assignedPartnerName = null;
          updatesToPersist.assignedAt = null;
          if (targetOrder.status === 'Assigned') {
            updatesToPersist.status = 'Waiting for Partner';
          }
        }
      }
    } else if (session.role === 'customer') {
      // Customer can only cancel their own order, and only if it's currently 'Pending'
      const cId = String(targetOrder.customerId || '').toLowerCase();
      const cEmail = String(targetOrder.customerEmail || '').toLowerCase();
      const sId = String(session.userId || '').toLowerCase();
      const sEmail = String(session.email || '').toLowerCase();

      const isOwner = (!cId || cId === sId || cId === sEmail || (cEmail && sEmail && cEmail === sEmail));
      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden: You cannot modify orders belonging to other accounts.' }, { status: 403 });
      }
      
      const allowedKeys = ['status'];
      const updateKeys = Object.keys(updates);
      const isKeysAllowed = updateKeys.every(k => allowedKeys.includes(k));
      if (!isKeysAllowed) {
        return NextResponse.json({ error: 'Forbidden: Customers can only modify order status field.' }, { status: 403 });
      }

      if (updates.status !== 'Cancelled') {
        return NextResponse.json({ error: 'Forbidden: Customers can only transition order to Cancelled.' }, { status: 403 });
      }

      if (targetOrder.status !== 'Pending') {
        return NextResponse.json({ error: 'Forbidden: Orders can only be cancelled while status is Pending.' }, { status: 400 });
      }
    } else {
      // Non-partner/non-admin/non-customer users cannot update order statuses via this endpoint
      return NextResponse.json({ error: 'Forbidden: Unauthorized role' }, { status: 403 });
    }

    // Append Status transitions History
    const prevStatus = String(targetOrder.status);
    const newStatus = updatesToPersist.status ? String(updatesToPersist.status) : prevStatus;
    const historyList = Array.isArray(targetOrder.statusHistory) ? [...targetOrder.statusHistory] : [];

    if (newStatus && newStatus !== prevStatus) {
      historyList.push({
        previousStatus: prevStatus,
        newStatus,
        changedByUserId: session.userId || session.email,
        changedByRole: session.role,
        timestamp: new Date().toISOString()
      });
      updatesToPersist.statusHistory = historyList;
    }
    
    const updatedOrder = await db.updateOrder(cleanId, updatesToPersist);
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error('Error updating order on server:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

