import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { getSession } from '../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const list = await db.readTable<any>('orders') || [];
    const payments = await db.readTable<any>('payment_transactions') || [];
    const paymentMap = new Map<string, any>();
    for (const p of payments) {
      if (p.orderId) {
        paymentMap.set(String(p.orderId).toLowerCase(), p);
      }
    }

    const enrichedList = list.map((o: any) => {
      const p = paymentMap.get(String(o.id).toLowerCase());

      // Canonical payment status with monotonic authority
      let canonicalPaymentStatus = o.paymentStatus || p?.status || 'NOT_STARTED';
      const orderPayUpper = String(o.paymentStatus || '').toUpperCase();
      const pPayUpper = String(p?.status || '').toUpperCase();
      const orderStatusUpper = String(o.status || '').toUpperCase();

      if (orderPayUpper === 'PAID' || pPayUpper === 'PAID' || orderStatusUpper === 'CONFIRMED' || orderStatusUpper === 'PREPARING' || orderStatusUpper === 'PACKED' || orderStatusUpper === 'OUT FOR DELIVERY' || orderStatusUpper === 'DELIVERED') {
        canonicalPaymentStatus = 'PAID';
      } else if (orderPayUpper === 'REJECTED' || pPayUpper === 'REJECTED') {
        canonicalPaymentStatus = 'REJECTED';
      } else if (orderPayUpper === 'PAYMENT_VERIFICATION_PENDING' || pPayUpper === 'PAYMENT_VERIFICATION_PENDING') {
        canonicalPaymentStatus = 'PAYMENT_VERIFICATION_PENDING';
      }

      return {
        ...o,
        paymentStatus: canonicalPaymentStatus,
        utr: o.utr || p?.utr || '',
        proofImageUrl: o.proofImageUrl || p?.proofImageUrl || '',
        paymentSubmittedAt: o.paymentSubmittedAt || p?.submittedAt,
        paymentVerifiedAt: o.paymentVerifiedAt || p?.verifiedAt,
        paymentRejectedAt: o.paymentRejectedAt || p?.rejectedAt,
        rejectionReason: o.rejectionReason || p?.rejectionReason,
      };
    });

    if (session.role === 'admin' || session.role === 'super_admin') {
      return NextResponse.json(enrichedList);
    }

    if (session.role === 'delivery_partner') {
      // Filter orders assigned to this partner and strip deliveryOtp
      const cleanPartnerId = String(session.userId || '').toLowerCase().trim();
      const cleanPartnerEmail = String(session.email || '').toLowerCase().trim();

      let myPartnerCustomId = '';
      let myPartnerPhone = '';
      try {
        const partners = await db.readTable<any>('partners') || [];
        const myPartnerRec = partners.find((p: any) => 
          String(p.id || '').toLowerCase().trim() === cleanPartnerId ||
          String(p.email || '').toLowerCase().trim() === cleanPartnerEmail ||
          (session.userId && String(p.id || '').toLowerCase().trim() === String(session.userId).toLowerCase().trim())
        );
        if (myPartnerRec) {
          myPartnerCustomId = String(myPartnerRec.id || '').toLowerCase().trim();
          myPartnerPhone = String(myPartnerRec.phone || '').replace(/\D/g, '');
        }
      } catch {}

      const filtered = enrichedList.filter((o: any) => {
        const aId = String(o.assignedPartnerId || '').toLowerCase().trim();
        if (!aId) return false;
        const aPhone = aId.replace(/\D/g, '');
        return (
          aId === cleanPartnerId ||
          aId === cleanPartnerEmail ||
          (myPartnerCustomId && aId === myPartnerCustomId) ||
          (myPartnerPhone && aPhone && (aId === myPartnerPhone || aPhone === myPartnerPhone))
        );
      });
      const sanitized = filtered.map((o: any) => {
        const { deliveryOtp, ...rest } = o;
        return rest;
      });
      return NextResponse.json(sanitized);
    }

    if (session.role === 'customer') {
      const sId = String(session.userId || '').toLowerCase().trim();
      const sEmail = String(session.email || '').toLowerCase().trim();
      const sPhoneDigits = sId.replace(/\D/g, '');

      // Lookup user's profile phone if available
      let profilePhone = '';
      try {
        const users = await db.readTable<any>('users') || [];
        const userObj = users.find((u: any) => 
          (u.userId && String(u.userId).toLowerCase() === sId) ||
          (u.email && String(u.email).toLowerCase() === sEmail)
        );
        if (userObj?.phone) {
          profilePhone = String(userObj.phone).replace(/\D/g, '');
        }
      } catch {}

      // Filter orders owned by this customer with full cross-identifier matching (email, userId, mobile)
      const filtered = enrichedList.filter((o: any) => {
        const cId = String(o.customerId || '').toLowerCase().trim();
        const cEmail = String(o.customerEmail || '').toLowerCase().trim();
        const orderAddr = (o.address && typeof o.address === 'object') ? o.address : {};
        const addrMobile = String(orderAddr.mobile || orderAddr.phone || '').replace(/\D/g, '');
        const cPhoneDigits = cId.replace(/\D/g, '');

        const isDirectMatch = (
          (cId && cId === sId) ||
          (cEmail && sEmail && cEmail === sEmail) ||
          (cId && sEmail && cId === sEmail) ||
          (cEmail && sId && cEmail === sId)
        );

        const isPhoneMatch = (
          (addrMobile && sPhoneDigits && (addrMobile === sPhoneDigits || sPhoneDigits.includes(addrMobile) || addrMobile.includes(sPhoneDigits))) ||
          (addrMobile && profilePhone && (addrMobile === profilePhone || profilePhone.includes(addrMobile) || addrMobile.includes(profilePhone))) ||
          (cPhoneDigits && profilePhone && (cPhoneDigits === profilePhone || profilePhone.includes(cPhoneDigits) || cPhoneDigits.includes(profilePhone))) ||
          (cPhoneDigits && sPhoneDigits && (cPhoneDigits === sPhoneDigits || sPhoneDigits.includes(cPhoneDigits) || cPhoneDigits.includes(sPhoneDigits)))
        );

        return Boolean(isDirectMatch || isPhoneMatch);
      });

      const sanitized = filtered.map((o: any) => {
        const otpActive = o.deliveryOtp && o.otpExpiresAt && new Date(o.otpExpiresAt) > new Date();
        if (o.status !== 'Out for Delivery' && o.status !== 'Delivered' && !otpActive) {
          return { ...o, deliveryOtp: '******' };
        }
        return o;
      });
      return NextResponse.json(sanitized);
    }

    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  } catch (err) {
    console.error('Error reading orders list:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Customer sign in required to place orders.' }, { status: 401 });
    }

    const body = await request.json();
    // Check if updating an existing order
    const cleanBodyId = body.id ? String(body.id).replace(/^#+/, '').trim() : '';
    if (cleanBodyId) {
      const existingOrder = await db.getOrderById(cleanBodyId);
      if (existingOrder) {
        const prevStatus = existingOrder.status;
        const newStatus = body.status;
        const hist = Array.isArray(existingOrder.statusHistory) ? [...existingOrder.statusHistory] : [];
        
        if (newStatus && newStatus !== prevStatus) {
          hist.push({
            previousStatus: prevStatus,
            newStatus,
            changedByUserId: session.userId || session.email || 'customer',
            changedByRole: session.role,
            timestamp: new Date().toISOString()
          });
        }

        const updated = await db.updateOrder(cleanBodyId, {
          ...body,
          id: cleanBodyId,
          statusHistory: hist
        });

        return NextResponse.json({ success: true, order: updated, orderId: cleanBodyId });
      }
    }
      // 1. New Order Creation must require a customer session
      if (session.role !== 'customer' && session.role !== 'admin') {
        return NextResponse.json({ error: 'Only customers can place orders.' }, { status: 403 });
      }

      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
      }

      if (!body.address || !body.address.street || !body.address.city) {
        return NextResponse.json({ error: 'Valid delivery address is required.' }, { status: 400 });
      }

      // Check if order contains wellness items
      const hasWellnessItem = body.items.some((item: any) => item.category === 'wellness');
      if (hasWellnessItem) {
        const wellnessSettings = await db.getWellnessSettings();
        const wellnessPublished = wellnessSettings.published;

        if (!wellnessPublished) {
          return NextResponse.json({ error: 'Checkout blocked: Wellness storefront is currently unpublished.' }, { status: 403 });
        }

        const users = await db.readTable<any>('users') || [];
        const userObj = users.find((u: any) => u.userId === session.userId || u.email === session.email);

        if (!userObj) {
          return NextResponse.json({ error: 'Checkout blocked: Customer profile record not found.' }, { status: 403 });
        }

        if (userObj.wellnessAccessStatus !== 'APPROVED' && userObj.wellnessAccessStatus !== 'ACTIVE') {
          return NextResponse.json({ error: 'Checkout blocked: Approved Wellness profile required.' }, { status: 403 });
        }
      }

      // 2. Server-side calculations & ID generation
      const orderId = body.id ? String(body.id).replace(/^#+/, '').trim() : `FT${Math.floor(100000 + Math.random() * 900000)}`;
      
      let calculatedSubtotal = 0;
      const sanitizedItems = (body.items || []).map((item: any) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        calculatedSubtotal += price * qty;
        return {
          productId: String(item.productId || item.id || '').trim(),
          id: String(item.id || item.productId || '').trim(),
          name: String(item.name || item.title || 'Product').trim(),
          price,
          quantity: qty,
          image: item.image || item.imageUrl || '',
          unit: item.unit || '',
          category: item.category || undefined,
          subtotal: price * qty
        };
      });

      const deliveryFee = calculatedSubtotal >= 799 ? 0 : 49;
      let discount = Number(body.discount) || 0;
      let appliedCoupon: any = null;

      if (body.couponCode) {
        const couponValidation = await db.validateCoupon(
          String(body.couponCode),
          calculatedSubtotal,
          { userId: session.userId, email: session.email, phone: (session as any).phone }
        );
        if (couponValidation.valid) {
          discount = Number(couponValidation.discountAmount || 0);
          appliedCoupon = couponValidation.coupon;
        } else {
          discount = 0;
        }
      }

      const grandTotal = Math.max(0, calculatedSubtotal + deliveryFee - discount);

      const now = new Date().toISOString();

      const newOrder = {
        id: orderId,
        customerId: session.userId,
        customerEmail: session.email,
        items: sanitizedItems,
        subtotal: calculatedSubtotal,
        deliveryFee,
        discount,
        couponCode: appliedCoupon?.code || undefined,
        total: grandTotal,
        address: body.address,
        status: 'Pending',
        paymentStatus: 'PENDING',
        paymentMethod: body.paymentMethod || 'Razorpay',
        deliveryOption: body.deliveryOption || 'ASAP',
        deliveryTimeSlot: body.deliveryOption === 'Scheduled' ? body.deliveryTimeSlot : undefined,
        scheduledDeliveryAt: body.scheduledDeliveryAt || undefined,
        eta: '35 mins',
        createdAt: now,
        deliveryLocationId: body.deliveryLocationId || 'nawabganj-unnao',
        deliveryLocationName: body.deliveryLocationName || 'Nawabganj, Unnao',
        deliveryOtp: Math.floor(100000 + Math.random() * 900000).toString(),
        otpFailedAttempts: 0,
        otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        statusHistory: [{
          previousStatus: null,
          newStatus: 'Pending',
          changedByUserId: session.userId,
          changedByRole: session.role,
          timestamp: now
        }]
      };

      const savedOrder = await db.createOrder(newOrder);

      // Record coupon usage if coupon applied
      if (appliedCoupon && discount > 0) {
        try {
          await db.recordCouponUsage({
            couponId: String(appliedCoupon.id),
            couponCode: String(appliedCoupon.code),
            customerId: session.userId,
            customerEmail: session.email,
            orderId,
            discountAmount: discount
          });
        } catch (couponErr) {
          console.error('Error recording coupon usage for order:', couponErr);
        }
      }

      // 3. Create or ensure payment transaction record in database
      const paymentId = `pay-${orderId}-${Date.now()}`;
      try {
        await db.query(
          `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, "createdAt", "updatedAt", "attemptCount")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT ("orderId") DO UPDATE 
           SET amount = $4, "updatedAt" = $10`,
          [paymentId, orderId, session.userId, grandTotal, 'INR', 'NOT_STARTED', body.paymentMethod || 'Razorpay', 'RAZORPAY', now, now, 0]
        );
      } catch (payErr) {
        console.warn('Non-fatal payment_transactions insert warning:', payErr);
      }

      return NextResponse.json({
        success: true,
        order: savedOrder || newOrder,
        orderId: (savedOrder && savedOrder.id) ? savedOrder.id : newOrder.id,
        paymentId,
        total: (savedOrder && savedOrder.total !== undefined) ? savedOrder.total : newOrder.total
      });
  } catch (err) {
    console.error('Error saving order:', err);
    return NextResponse.json({ error: 'Server error processing order creation.' }, { status: 500 });
  }
}
