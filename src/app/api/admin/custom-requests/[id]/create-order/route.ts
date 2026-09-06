import { NextResponse } from 'next/server';
import { db } from '@/data/db';
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

    const customReq = await db.getCustomRequestById(cleanId);
    if (!customReq) {
      return NextResponse.json({ error: `Custom request ${cleanId} not found.` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const finalAmount = Number(body.amount ?? customReq.quotedAmount ?? 0);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: 'A valid final order price must be set before creating a custom order.' }, { status: 400 });
    }

    // Check if custom order already exists
    if (customReq.customOrderId) {
      const existingOrder = await db.getOrderById(customReq.customOrderId);
      if (existingOrder) {
        return NextResponse.json({
          success: true,
          message: `Custom order already exists: #${existingOrder.id}`,
          order: existingOrder,
          alreadyExisted: true
        });
      }
    }

    const customOrderId = `FT-CUST-${Date.now().toString().slice(-6)}`;
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date().toISOString();

    const orderItem = {
      productId: customReq.productId || `custom-sku-${Date.now().toString().slice(-4)}`,
      id: customReq.productId || `custom-sku-${Date.now().toString().slice(-4)}`,
      name: body.productName || customReq.productName || 'Bespoke Custom Product',
      price: finalAmount / (customReq.quantity || 1),
      quantity: customReq.quantity || 1,
      image: customReq.uploadedImageUrl || customReq.referenceImageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60',
      category: 'Personalisation',
      unit: '1 Custom Item',
      selectedSize: customReq.variant || undefined,
      selectedType: customReq.personalisationType || undefined,
      flavour: customReq.flavour || undefined,
      cakeMessage: customReq.personalisationMessage || undefined,
      customImage: customReq.uploadedImageUrl || customReq.referenceImageUrl || undefined,
      specialInstructions: customReq.specialInstructions || customReq.requestedDetails || undefined,
      subtotal: finalAmount
    };

    const orderPayload = {
      id: customOrderId,
      customerId: customReq.customerId,
      customerName: customReq.customerName,
      customerPhone: customReq.mobile,
      customerEmail: customReq.email,
      items: [orderItem],
      subtotal: finalAmount,
      deliveryFee: 0,
      discount: 0,
      total: finalAmount,
      address: {
        name: customReq.customerName,
        mobile: customReq.mobile,
        house: body.addressHouse || 'Customer Address (Custom Delivery)',
        street: body.addressStreet || 'Local Dispatch Sector',
        area: body.addressArea || 'Hub Zone',
        city: body.addressCity || 'Unnao',
        pincode: body.addressPincode || '209801',
        landmark: body.addressLandmark || undefined
      },
      status: 'Pending',
      paymentStatus: 'PENDING',
      paymentMethod: 'Razorpay',
      deliveryOption: customReq.preferredDeliveryDate ? 'Scheduled' : 'ASAP',
      deliveryTimeSlot: customReq.preferredDeliveryTime || undefined,
      scheduledDeliveryAt: customReq.preferredDeliveryDate || undefined,
      deliveryLocationId: 'nawabganj-unnao',
      deliveryLocationName: 'Unnao Central Hub',
      deliveryOtp: otpCode,
      delivery_otp_verified: false,
      otpFailedAttempts: 0,
      createdAt: now,
      updatedAt: now,
      isCustomOrder: true,
      customRequestId: cleanId
    };

    const createdOrder = await db.createOrder(orderPayload);

    // Update custom request record with customOrderId & status
    await db.updateCustomRequest(cleanId, {
      customOrderId,
      quotedAmount: finalAmount,
      status: 'Payment Pending',
      paymentStatus: 'PENDING'
    });

    db.logActivity(
      adminSession.email || 'Admin',
      'CUSTOM_ORDER_CREATED',
      `Order #${customOrderId}`,
      `Request #${cleanId}`,
      `₹${finalAmount}`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Custom order #${customOrderId} created successfully in database and linked to customer profile.`,
      order: createdOrder,
      customRequestId: cleanId
    }, { status: 201 });
  } catch (err) {
    console.error('Error creating custom order from admin request:', err);
    return NextResponse.json({ error: 'Failed to create custom order.' }, { status: 500 });
  }
}
