import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function processProofImage(fileObj: File): Promise<string> {
  const mimeType = (fileObj.type || '').toLowerCase();
  const fileName = (fileObj.name || '').toLowerCase();
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);
  const hasValidExt = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

  if (!isAllowedMime && !hasValidExt) {
    throw new Error('Invalid file type. Upload JPG, PNG, or WebP only.');
  }

  if (fileObj.size > MAX_FILE_SIZE) {
    throw new Error('Payment proof is too large. Maximum allowed size is 8MB.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const safeName = (fileObj.name || 'proof.jpg').replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-');
  const storagePath = `payments/${Date.now()}-${safeName}`;

  if (supabaseUrl && supabaseKey) {
    try {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/product-images/${storagePath}`;
      const arrayBuffer = await fileObj.arrayBuffer();

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': mimeType || 'image/jpeg',
          'x-upsert': 'true'
        },
        body: arrayBuffer,
        signal: AbortSignal.timeout(2000)
      });

      if (uploadRes.ok) {
        return `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
      }
    } catch (err) {
      console.warn('Direct upload warning (fallback to base64):', err);
    }
  }

  const buffer = Buffer.from(await fileObj.arrayBuffer());
  return `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let orderId = '';
    let paymentId = '';
    let utr = '';
    let proofImageUrl = '';
    let fileObj: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      orderId = String(formData.get('orderId') || '').trim();
      paymentId = String(formData.get('paymentId') || '').trim();
      utr = String(formData.get('utr') || '').trim();
      proofImageUrl = String(formData.get('proofImageUrl') || '').trim();
      const file = formData.get('file');
      if (file && typeof file !== 'string' && typeof (file as any).arrayBuffer === 'function') {
        fileObj = file as File;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      orderId = String(body.orderId || '').trim();
      paymentId = String(body.paymentId || '').trim();
      utr = String(body.utr || '').trim();
      proofImageUrl = String(body.proofImageUrl || '').trim();
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const trimmedUtr = utr.trim();
    if (!trimmedUtr) {
      return NextResponse.json({ error: 'UTR / Transaction Reference number is required.' }, { status: 400 });
    }

    // Process image file if uploaded in multipart request
    if (fileObj) {
      try {
        proofImageUrl = await processProofImage(fileObj);
      } catch (fileErr) {
        const msg = fileErr instanceof Error ? fileErr.message : 'Invalid payment proof image.';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (!proofImageUrl) {
      return NextResponse.json({ error: 'Payment proof screenshot is required.' }, { status: 400 });
    }

    const cleanOrderId = decodeURIComponent(orderId).trim();

    // 1. Fetch order reliably with case-insensitive search
    const order = await db.getOrderById(cleanOrderId);

    if (!order) {
      console.warn(`[PAYMENT SUBMIT] Order not found for ID: "${cleanOrderId}"`);
      return NextResponse.json({ error: 'Order not found in records.' }, { status: 404 });
    }

    // 2. Authorization check if session is active
    const session = await getSession(request);
    if (session) {
      if (session.role !== 'customer' && session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized session role.' }, { status: 403 });
      }
    }

    const serverTotal = Number(order.total || 0);
    const now = new Date().toISOString();

    // 3. Update or Insert payment transaction record
    let payment = await db.getPaymentByOrderId(String(order.id));
    if (!payment && paymentId) {
      payment = await db.getPaymentById(paymentId);
    }

    const customerIdVal = session?.userId || String(order.customerId || order.customerEmail || 'customer');

    if (payment) {
      try {
        await db.query(
          `UPDATE payment_transactions
           SET utr = $1,
               "proofImageUrl" = $2,
               status = $3,
               "submittedAt" = $4,
               "updatedAt" = $5,
               "paymentProofType" = $6,
               metadata = COALESCE(metadata, '{}'::jsonb) || $7::jsonb
           WHERE LOWER(id) = LOWER($8) OR LOWER("orderId") = LOWER($9)`,
          [
            trimmedUtr,
            proofImageUrl,
            'PAYMENT_VERIFICATION_PENDING',
            now,
            now,
            'image',
            JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
            String(payment.id),
            String(order.id)
          ]
        );
      } catch (payUpErr) {
        console.warn('payment_transactions update warning:', payUpErr);
      }
      await db.updatePaymentStatus(String(payment.id), 'PAYMENT_VERIFICATION_PENDING', {
        utr: trimmedUtr,
        proofImageUrl,
        submittedAt: now
      });
    } else {
      const newPayId = paymentId || `pay-${order.id}-${Date.now()}`;
      try {
        await db.query(
          `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, utr, "proofImageUrl", "submittedAt", "createdAt", "updatedAt", "attemptCount", metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT ("orderId") DO UPDATE
           SET utr = $9, "proofImageUrl" = $10, "submittedAt" = $11, status = $6, "updatedAt" = $13`,
          [
            newPayId,
            order.id,
            customerIdVal,
            serverTotal,
            'INR',
            'PAYMENT_VERIFICATION_PENDING',
            'UPI',
            'MANUAL_UPI',
            trimmedUtr,
            proofImageUrl,
            now,
            now,
            now,
            1,
            JSON.stringify({ proofSubmittedAt: now, proofSource: 'manual_upi' }),
          ]
        );
      } catch (payInsErr) {
        console.warn('payment_transactions insert warning:', payInsErr);
      }
      await db.createPayment({
        id: newPayId,
        orderId: order.id,
        customerId: customerIdVal,
        amount: serverTotal,
        currency: 'INR',
        status: 'PAYMENT_VERIFICATION_PENDING',
        method: 'UPI',
        provider: 'MANUAL_UPI',
        utr: trimmedUtr,
        proofImageUrl,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
        attemptCount: 1
      });
    }

    // 4. Update order payment status in database reliably
    const updatedOrder = await db.updateOrder(cleanOrderId, {
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      utr: trimmedUtr,
      proofImageUrl,
      paymentSubmittedAt: now,
      updatedAt: now,
      rejectionReason: null
    });

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully. Your payment is under review by our team.',
      paymentStatus: 'PAYMENT_VERIFICATION_PENDING',
      order: updatedOrder,
      orderId: order.id,
      utr: trimmedUtr,
      proofImageUrl,
    });
  } catch (error) {
    console.error('Manual UPI proof submission error:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof.' }, { status: 500 });
  }
}
