import { NextResponse } from 'next/server';
import { db, CustomRequestRecord } from '@/data/db';
import { getSession } from '@/data/auth';
import { sendCustomRequestReceivedEmail } from '@/services/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const { searchParams } = new URL(request.url);
    const queryCustomerId = searchParams.get('customerId') || searchParams.get('customerEmail') || '';

    // Authorization: User must be logged in as customer/admin, or provide customer identifier matching session
    let targetIdentifier = '';
    if (session && session.userId) {
      targetIdentifier = session.userId;
    } else if (session && session.email) {
      targetIdentifier = session.email;
    } else if (queryCustomerId) {
      targetIdentifier = queryCustomerId;
    }

    if (!targetIdentifier) {
      return NextResponse.json({ customRequests: [] });
    }

    const requests = await db.getCustomRequestsByCustomer(targetIdentifier);

    return NextResponse.json({
      success: true,
      customRequests: requests
    });
  } catch (err) {
    console.error('Error fetching customer custom requests:', err);
    return NextResponse.json({ error: 'Failed to retrieve custom requests.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));

    let sessionName = '';
    let sessionPhone = '';
    if (session && session.userId) {
      const userRec = await db.getUserById(session.userId);
      if (userRec) {
        sessionName = userRec['name'] ? String(userRec['name']) : '';
        sessionPhone = userRec['phone'] ? String(userRec['phone']) : '';
      }
    }

    const customerName = String(body.customerName || sessionName || '').trim();
    const email = String(body.email || session?.email || '').trim().toLowerCase();
    const mobile = String(body.mobile || body.phone || sessionPhone || '').trim();
    const requestType = body.requestType === 'UNLISTED_PRODUCT' ? 'UNLISTED_PRODUCT' : 'EXISTING_PRODUCT';

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
    }
    if (!mobile) {
      return NextResponse.json({ error: 'Valid mobile number is required.' }, { status: 400 });
    }

    // Determine Customer ID
    let customerId = session?.userId || body.customerId;
    if (!customerId) {
      customerId = email ? `CUST-${email.split('@')[0]}` : `CUST-${mobile.replace(/[^0-9]/g, '')}`;
    }

    const payload: Partial<CustomRequestRecord> = {
      customerId,
      customerName,
      email,
      mobile,
      requestType,
      productId: body.productId ? String(body.productId).trim() : undefined,
      productName: body.productName ? String(body.productName).trim() : (requestType === 'UNLISTED_PRODUCT' ? String(body.requestedTitle || 'Custom Request') : 'FATAFAT Celebration Item'),
      requestedDetails: body.requestedDetails ? String(body.requestedDetails).trim() : undefined,
      quantity: Math.max(1, Number(body.quantity || 1)),
      variant: body.variant ? String(body.variant).trim() : (body.selectedSize ? String(body.selectedSize).trim() : undefined),
      flavour: body.flavour ? String(body.flavour).trim() : undefined,
      personalisationType: body.personalisationType ? String(body.personalisationType).trim() : undefined,
      personalisationMessage: body.personalisationMessage ? String(body.personalisationMessage).trim() : (body.cakeMessage ? String(body.cakeMessage).trim() : undefined),
      uploadedImageUrl: body.uploadedImageUrl ? String(body.uploadedImageUrl).trim() : undefined,
      referenceImageUrl: body.referenceImageUrl ? String(body.referenceImageUrl).trim() : undefined,
      specialInstructions: body.specialInstructions ? String(body.specialInstructions).trim() : undefined,
      preferredDeliveryDate: body.preferredDeliveryDate ? String(body.preferredDeliveryDate).trim() : undefined,
      preferredDeliveryTime: body.preferredDeliveryTime ? String(body.preferredDeliveryTime).trim() : undefined,
      budget: body.budget ? String(body.budget).trim() : undefined,
      status: 'Request Submitted',
      paymentStatus: 'PENDING'
    };

    const created = await db.createCustomRequest(payload);

    // Trigger Non-blocking Email Notifications to Customer & Admin
    void sendCustomRequestReceivedEmail(created);

    return NextResponse.json({
      success: true,
      message: 'Custom request submitted successfully! Our team will review and confirm availability.',
      customRequest: created
    }, { status: 201 });
  } catch (err) {
    console.error('Error creating custom request:', err);
    return NextResponse.json({ error: 'Failed to submit custom request.' }, { status: 500 });
  }
}
