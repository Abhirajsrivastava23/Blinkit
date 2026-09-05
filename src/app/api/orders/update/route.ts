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

    let cleanId = String(id || '').trim();
    while (cleanId.includes('%23') || cleanId.includes('%20') || cleanId.includes('%2F')) {
      try {
        const decoded = decodeURIComponent(cleanId);
        if (decoded === cleanId) break;
        cleanId = decoded;
      } catch {
        break;
      }
    }
    
    let targetOrder = await db.getOrderById(cleanId);
    if (!targetOrder && cleanId.startsWith('#')) {
      targetOrder = await db.getOrderById(cleanId.replace(/^#+/, ''));
    }
    if (!targetOrder && !cleanId.toUpperCase().startsWith('FT')) {
      targetOrder = await db.getOrderById('FT' + cleanId.replace(/^#+/, ''));
    }
    if (!targetOrder) {
      targetOrder = await db.getOrderById('#' + cleanId.replace(/^#+/, ''));
    }
    if (!targetOrder) {
      targetOrder = await db.getOrderById(cleanId.replace(/^#?FT/i, ''));
    }
    if (!targetOrder && body.orderData?.id) {
      targetOrder = await db.getOrderById(String(body.orderData.id));
    }
    if (!targetOrder) {
      const allOrders = await db.readTable<any>('orders') || [];
      const cleanLower = cleanId.toLowerCase().replace(/^#+/, '').trim();
      const digitsOnly = cleanLower.replace(/\D/g, '');
      targetOrder = allOrders.find((o: any) => {
        const oid = String(o.id || o.ID || '').toLowerCase().replace(/^#+/, '').trim();
        const oidDigits = oid.replace(/\D/g, '');
        return (
          oid === cleanLower ||
          oid.replace(/^ft/i, '') === cleanLower.replace(/^ft/i, '') ||
          (digitsOnly && oidDigits && digitsOnly === oidDigits) ||
          (cleanLower.length >= 4 && (oid.includes(cleanLower) || cleanLower.includes(oid)))
        );
      });
    }

    // Auto-restore order record if client provided visible order data (e.g. from local session/cache)
    if (!targetOrder && body.orderData && typeof body.orderData === 'object') {
      const incomingOrder = body.orderData;
      const authoritativeCleanId = String(incomingOrder.id || cleanId).replace(/^#+/, '').trim();
      try {
        const created = await db.createOrder({
          ...incomingOrder,
          id: authoritativeCleanId,
          customerId: incomingOrder.customerId || session.userId || 'customer',
          customerEmail: incomingOrder.customerEmail || (session.role === 'customer' ? session.email : undefined),
          items: Array.isArray(incomingOrder.items) ? incomingOrder.items : [],
          address: incomingOrder.address || {},
          subtotal: Number(incomingOrder.subtotal || incomingOrder.total || 0),
          deliveryFee: Number(incomingOrder.deliveryFee || 0),
          discount: Number(incomingOrder.discount || 0),
          total: Number(incomingOrder.total || 0),
          status: incomingOrder.status || 'Pending',
          paymentStatus: incomingOrder.paymentStatus || 'PENDING',
          deliveryOption: incomingOrder.deliveryOption || 'ASAP',
          deliveryTimeSlot: incomingOrder.deliveryTimeSlot || 'Within 15 mins',
          deliveryLocationId: incomingOrder.deliveryLocationId || 'nawabganj-unnao',
          deliveryLocationName: incomingOrder.deliveryLocationName || 'Nawabganj, Unnao',
          deliveryOtp: incomingOrder.deliveryOtp || Math.floor(100000 + Math.random() * 900000).toString(),
          createdAt: incomingOrder.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        targetOrder = created;
      } catch (createErr) {
        console.warn('[Order Update] Fallback order creation error:', createErr);
      }
      if (!targetOrder) {
        targetOrder = {
          ...incomingOrder,
          id: authoritativeCleanId,
          status: incomingOrder.status || 'Pending'
        };
      }
    }
    
    if (!targetOrder) {
      console.warn(`[Order Update 404] Order not found for ID: "${id}" (resolved cleanId: "${cleanId}")`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatesToPersist: Record<string, unknown> = { ...updates };

    // Transition verification constraints (applies to Partner and Customer status changes)
    if (updates.status && updates.status !== targetOrder.status) {
      const currentStatus = String(targetOrder.status);
      const targetStatus = String(updates.status);

      const validTransitions: Record<string, string[]> = {
        'Pending': ['Confirmed', 'Preparing', 'Packed', 'Ready for Delivery', 'Waiting for Partner', 'Assigned', 'Accepted', 'Picked Up', 'Cancelled'],
        'Confirmed': ['Preparing', 'Packed', 'Ready for Delivery', 'Waiting for Partner', 'Assigned', 'Accepted', 'Picked Up', 'Cancelled'],
        'Preparing': ['Packed', 'Ready for Delivery', 'Waiting for Partner', 'Assigned', 'Accepted', 'Picked Up', 'Cancelled'],
        'Packed': ['Ready for Delivery', 'Waiting for Partner', 'Assigned', 'Accepted', 'Picked Up', 'Cancelled'],
        'Ready for Delivery': ['Waiting for Partner', 'Assigned', 'Accepted', 'Picked Up', 'Cancelled'],
        'Waiting for Partner': ['Assigned', 'Accepted', 'Picked Up', 'Cancelled'],
        'Assigned': ['Accepted', 'Picked Up', 'Out for Delivery', 'Waiting for Partner', 'Cancelled'],
        'Accepted': ['Picked Up', 'Out for Delivery', 'Waiting for Partner', 'Cancelled', 'Failed Delivery'],
        'Picked Up': ['Out for Delivery', 'Delivered', 'Cancelled', 'Failed Delivery'],
        'Out for Delivery': ['Delivered', 'Cancelled', 'Failed Delivery']
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
      // 1. Is it assigned to this partner or available to claim?
      const assignedId = String(targetOrder.assignedPartnerId || '').trim().toLowerCase();
      const sId = String(session.userId || '').trim().toLowerCase();
      const sEmail = String(session.email || '').trim().toLowerCase();

      let isMyOrder = false;
      if (!assignedId) {
        isMyOrder = true;
      } else if (assignedId === sId || assignedId === sEmail) {
        isMyOrder = true;
      } else {
        try {
          const partners = await db.readTable<any>('partners') || [];
          const myPartnerRec = partners.find((p: any) => 
            String(p.id || '').toLowerCase().trim() === sId ||
            String(p.email || '').toLowerCase().trim() === sEmail ||
            (session.userId && String(p.id || '').toLowerCase().trim() === String(session.userId).toLowerCase().trim())
          );
          if (myPartnerRec) {
            const pId = String(myPartnerRec.id || '').toLowerCase().trim();
            const pPhone = String(myPartnerRec.phone || '').replace(/\D/g, '');
            const aPhone = assignedId.replace(/\D/g, '');
            if (assignedId === pId || (pPhone && aPhone && (assignedId === pPhone || aPhone === pPhone))) {
              isMyOrder = true;
            }
          }
        } catch {}
      }

      if (!isMyOrder) {
        return NextResponse.json({ error: 'Forbidden: You cannot modify orders assigned to other partners.' }, { status: 403 });
      }

      // If unassigned and partner accepts/picks up, claim assignment
      if (!assignedId && (updates.status === 'Accepted' || updates.status === 'Picked Up')) {
        updatesToPersist.assignedPartnerId = session.userId;
        updatesToPersist.assignedPartnerName = (session as any).name || session.email || 'Delivery Partner';
        updatesToPersist.assignedAt = new Date().toISOString();
      }

      // 2. Limit what fields can be updated
      const allowedKeys = [
        'status', 'failedReason', 'failedComment', 'arrivedNotify', 'otpVerified', 
        'verifiedItemIds', 'boxSealVerified', 'otpCode', 'otpInput', 'otp_verified', 
        'otp_verified_at', 'delivery_otp_verified', 'verified_by_partner_id', 'delivery_completed_at'
      ];
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
        const requiredItemIds = itemsList.map((item: any) => item.productId || item.id).filter(Boolean);
        if (updates.verifiedItemIds !== undefined && Array.isArray(updates.verifiedItemIds)) {
          const verifiedItemIds = updates.verifiedItemIds;
          const allItemsVerified = requiredItemIds.length === 0 || requiredItemIds.every((prodId: string) => verifiedItemIds.includes(prodId));
          if (!allItemsVerified) {
            return NextResponse.json({ error: 'All items must be verified before pickup.' }, { status: 400 });
          }
        }

        // Add additional server-derived metadata
        updatesToPersist.pickupTimestamp = new Date().toISOString();
        updatesToPersist.pickupPartnerId = session.userId;
        updatesToPersist.pickupVerificationStatus = 'Verified';
      }

      // 5. OTP verification validations for DELIVERED status
      if (updates.status === 'Delivered') {
        if (targetOrder.status !== 'Out for Delivery' && targetOrder.status !== 'Picked Up') {
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
    } else if (session.role === 'admin' || session.role === 'super_admin') {
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
          const partnerIdToAssign = String(updates.assignedPartnerId).trim();
          
          // Verify that the delivery partner actually exists in the database
          let foundP = await db.getPartnerById(partnerIdToAssign);
          if (!foundP) {
            const partners = await db.getPartners();
            const partnerIdLower = partnerIdToAssign.toLowerCase();
            const partnerDigits = partnerIdToAssign.replace(/\D/g, '');
            foundP = partners.find((p: any) => {
              const pId = String(p.id || '').toLowerCase().trim();
              const pEmail = String(p.email || '').toLowerCase().trim();
              const pName = String(p.name || '').toLowerCase().trim();
              const pPhone = String(p.phone || '').replace(/\D/g, '');
              return (
                pId === partnerIdLower ||
                pEmail === partnerIdLower ||
                pName === partnerIdLower ||
                (partnerDigits && pPhone && partnerDigits === pPhone)
              );
            }) || null;
          }

          if (!foundP) {
            console.error(`[Order Update] Delivery partner "${partnerIdToAssign}" not found in database records.`);
            return NextResponse.json({ 
              error: `Selected delivery partner "${partnerIdToAssign}" does not exist in partner records.` 
            }, { status: 404 });
          }

          updatesToPersist.assignedPartnerId = String(foundP.id || partnerIdToAssign);
          updatesToPersist.assignedPartnerName = String(foundP.name || updates.assignedPartnerName || 'Delivery Partner');
          updatesToPersist.assignedAt = updates.assignedAt || new Date().toISOString();
          
          // Atomically set status to 'Assigned' if pending/confirmed/preparing/packed/ready/waiting/placed
          if (!updates.status && (
            targetOrder.status === 'Pending' || 
            targetOrder.status === 'Confirmed' || 
            targetOrder.status === 'Preparing' || 
            targetOrder.status === 'Packed' || 
            targetOrder.status === 'Ready for Delivery' || 
            targetOrder.status === 'Waiting for Partner' ||
            targetOrder.status === 'Placed'
          )) {
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
    
    const orderKey = targetOrder.id ? String(targetOrder.id) : cleanId;
    const updatedOrder = await db.updateOrder(orderKey, updatesToPersist);
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error('Error updating order on server:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

