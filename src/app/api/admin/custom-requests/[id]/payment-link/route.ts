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

    const amount = Number(customReq.quotedAmount || 0);
    if (amount <= 0) {
      return NextResponse.json({ error: 'Please set a valid quoted price before generating a payment link.' }, { status: 400 });
    }

    const orderId = customReq.customOrderId || `FT-CUST-${Date.now().toString().slice(-6)}`;
    const host = request.headers.get('host') || 'www.fatafatapp.me';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Direct verified payment portal link for this custom order
    let paymentLinkUrl = `${protocol}://${host}/order/${orderId}/payment`;
    let paymentLinkId = `plink_${Date.now()}`;

    // If Razorpay API credentials are configured, attempt to create server-side payment link
    const rzpKey = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

    if (rzpKey && rzpSecret) {
      try {
        const authHeader = `Basic ${Buffer.from(`${rzpKey}:${rzpSecret}`).toString('base64')}`;
        const rzpRes = await fetch('https://api.razorpay.com/v1/payment_links', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // in paise
            currency: 'INR',
            accept_partial: false,
            description: `FATAFAT Custom Order #${orderId} - ${customReq.productName || 'Personalised Product'}`,
            customer: {
              name: customReq.customerName,
              email: customReq.email || undefined,
              contact: customReq.mobile || undefined
            },
            notify: {
              sms: !!customReq.mobile,
              email: !!customReq.email
            },
            reminder_enable: true,
            callback_url: `${protocol}://${host}/payment-success?orderId=${orderId}`,
            callback_method: 'get'
          }),
          signal: AbortSignal.timeout(4000)
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          if (rzpData.short_url) {
            paymentLinkUrl = rzpData.short_url;
            paymentLinkId = rzpData.id || paymentLinkId;
          }
        }
      } catch (rzpErr) {
        console.warn('Razorpay server-side payment link generation fallback to internal link:', rzpErr);
      }
    }

    // Update custom request record with payment link
    await db.updateCustomRequest(cleanId, {
      paymentLinkId,
      paymentLinkUrl,
      paymentStatus: 'PENDING',
      status: 'Payment Pending'
    });

    const shareMessage = `Hi ${customReq.customerName}, your custom order for "${customReq.productName || 'Personalised Product'}" (Total: ₹${amount}) is ready! Please complete your payment securely using this link: ${paymentLinkUrl} - Team FATAFAT`;

    return NextResponse.json({
      success: true,
      message: 'Payment link generated successfully.',
      paymentLinkId,
      paymentLinkUrl,
      orderId,
      amount,
      customerEmail: customReq.email,
      customerMobile: customReq.mobile,
      shareMessage
    });
  } catch (err) {
    console.error('Error generating payment link:', err);
    return NextResponse.json({ error: 'Failed to generate payment link.' }, { status: 500 });
  }
}
