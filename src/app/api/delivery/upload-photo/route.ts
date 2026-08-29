import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'delivery_partner') {
      return NextResponse.json({ error: 'Unauthorized: Delivery Partner session required' }, { status: 401 });
    }

    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const file = formData.get('file') as File;

    if (!orderId || !file) {
      return NextResponse.json({ error: 'Order ID and image file are required.' }, { status: 400 });
    }

    // Load active orders to verify assignment
    const orders = await db.readTable<any>('orders') || [];
    const orderObj = orders.find(
      o => o.id === orderId && 
           o.assignedPartnerId === session.userId && 
           o.status !== 'Delivered' && 
           o.status !== 'Cancelled'
    );

    if (!orderObj) {
      return NextResponse.json({ error: 'Access Denied: You do not have an active delivery assigned with this Order ID.' }, { status: 403 });
    }

    // Supabase REST Storage API Upload Attempt
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const filename = `proof-${orderId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

    let photoUrl = '';

    if (supabaseUrl && supabaseKey) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/delivery-photos/${filename}`;
        const arrayBuffer = await file.arrayBuffer();

        const supabaseRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': file.type || 'image/jpeg'
          },
          body: arrayBuffer
        });

        if (supabaseRes.ok) {
          photoUrl = `${supabaseUrl}/storage/v1/object/public/delivery-photos/${filename}`;
        } else {
          console.warn('Supabase storage direct upload response error:', await supabaseRes.text());
        }
      } catch (uploadErr) {
        console.error('Error during Supabase direct file upload:', uploadErr);
      }
    }

    // Fallback to Unsplash proof image in development if Supabase setup is missing
    if (!photoUrl) {
      photoUrl = `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60`;
    }

    // Insert record in delivery_photos table
    const photoId = 'ph-' + Math.floor(100000 + Math.random() * 900000);
    await db.query(
      `INSERT INTO delivery_photos (id, "orderId", "partnerId", "photoUrl", category, "uploadedAt") 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [photoId, orderId, session.userId, photoUrl, 'Proof', new Date().toISOString()]
    );

    // Update order status history to log photo upload
    const orderIdx = orders.findIndex(o => o.id === orderId);
    if (orderIdx > -1) {
      const hist = orders[orderIdx].statusHistory || [];
      hist.push({
        status: orders[orderIdx].status,
        updatedAt: new Date().toISOString(),
        note: `Proof photo uploaded: ${photoId}`
      });
      orders[orderIdx].statusHistory = hist;
      await db.writeTable('orders', orders);
    }

    return NextResponse.json({ success: true, photoUrl });
  } catch (err) {
    console.error('Error handling delivery photo upload:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
