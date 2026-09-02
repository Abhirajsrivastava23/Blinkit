import { NextResponse } from 'next/server';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'customer' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Customer session required.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Payment proof image file is required.' }, { status: 400 });
    }

    const fileObj = file as File;
    const mimeType = (fileObj.type || '').toLowerCase();
    const fileName = (fileObj.name || '').toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);
    const hasValidExt = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

    if (!isAllowedMime && !hasValidExt) {
      return NextResponse.json({ error: 'Invalid file type. Upload JPG, PNG, or WebP only.' }, { status: 400 });
    }

    if (fileObj.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Payment proof is too large. Maximum allowed size is 8MB.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const safeName = (fileObj.name || 'proof.jpg').replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-');
    const storagePath = `payments/${Date.now()}-${safeName}`;

    let publicUrl = '';

    if (supabaseUrl && supabaseKey) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/product-images/${storagePath}`;
        const arrayBuffer = await fileObj.arrayBuffer();

        let uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': mimeType || 'image/jpeg',
            'x-upsert': 'true'
          },
          body: arrayBuffer,
          signal: AbortSignal.timeout(2500)
        });

        if (uploadRes.status === 404) {
          try {
            await fetch(`${supabaseUrl}/storage/v1/bucket`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id: 'product-images', name: 'product-images', public: true }),
              signal: AbortSignal.timeout(2000)
            });

            uploadRes = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': mimeType || 'image/jpeg',
                'x-upsert': 'true'
              },
              body: arrayBuffer,
              signal: AbortSignal.timeout(2500)
            });
          } catch (bucketErr) {
            console.warn('Supabase bucket retry error:', bucketErr);
          }
        }

        if (uploadRes.ok) {
          publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
        } else {
          console.warn('Supabase storage upload error:', await uploadRes.text().catch(() => ''));
        }
      } catch (err) {
        console.warn('Supabase direct upload warning (fallback to base64):', err);
      }
    }

    if (!publicUrl) {
      const buffer = Buffer.from(await fileObj.arrayBuffer());
      publicUrl = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileType: mimeType,
      fileSize: fileObj.size
    });
  } catch (error) {
    console.error('Payment proof upload error:', error);
    return NextResponse.json({ error: 'Failed to upload payment proof.' }, { status: 500 });
  }
}
