import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';
import { Product } from '../../../../data/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  try {
    // 1. Server-side session & role verification
    const session = await getSession(request);
    if (!session || (session.role !== 'delivery_partner' && session.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized: Delivery Partner or Admin authorization required.' },
        { status: 403 }
      );
    }

    let productId = '';
    let file: File | null = null;
    let directImageUrl = '';

    // 2. Parse request payload (Multipart FormData or JSON)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      productId = (formData.get('productId') as string) || '';
      const formFile = formData.get('file');
      if (formFile && typeof formFile === 'object' && typeof (formFile as any).arrayBuffer === 'function') {
        file = formFile as File;
      }
      directImageUrl = (formData.get('imageUrl') as string) || '';
    } else {
      const jsonBody = await request.json().catch(() => ({}));
      productId = jsonBody.productId || '';
      directImageUrl = jsonBody.imageUrl || '';
    }

    const cleanProductId = decodeURIComponent(String(productId || '')).trim();

    if (!cleanProductId || (!file && !directImageUrl)) {
      return NextResponse.json(
        { error: 'Product ID and image file (or image URL) are required.' },
        { status: 400 }
      );
    }

    console.log('[RIDER PHOTO] productId received:', cleanProductId);
    console.log('[RIDER PHOTO] file received:', file ? `${file.name} (${file.size} bytes)` : 'None (direct URL)');

    // 3. Validate and resolve canonical product
    let rawProduct: any = null;
    try {
      const pRes = await db.query(
        'SELECT * FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM($1)) OR LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
        [cleanProductId]
      );
      if (pRes.rows.length > 0) {
        rawProduct = pRes.rows[0];
      }
    } catch (e) {
      console.warn('PostgreSQL product lookup warning:', e);
    }

    if (!rawProduct) {
      const products = await db.readTable<Product>('products') || [];
      rawProduct = products.find(p => 
        String(p.id).trim().toLowerCase() === cleanProductId.toLowerCase() ||
        String(p.name).trim().toLowerCase() === cleanProductId.toLowerCase()
      );
    }

    if (!rawProduct) {
      console.warn(`[RIDER PHOTO] Product not found for query: "${cleanProductId}"`);
      return NextResponse.json(
        { error: `Product not found with ID or name: ${cleanProductId}` },
        { status: 404 }
      );
    }

    const canonicalId = String(rawProduct.id || cleanProductId).trim();
    const previousImage = rawProduct.image || '';
    let imageUrl = '';
    let storagePath = '';

    console.log('[RIDER PHOTO] DB lookup result: found canonicalId =', canonicalId);

    // 4. Handle File Upload or Direct Image URL
    if (file) {
      const mimeType = (file.type || '').toLowerCase();
      const fileName = (file.name || '').toLowerCase();
      const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);
      const hasValidExtension = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

      if (!isAllowedMime && !hasValidExtension) {
        return NextResponse.json(
          { error: 'Invalid file format. Only JPEG, PNG, and WebP images are supported.' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds the 8 MB maximum limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
          { status: 400 }
        );
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const sanitizedFileName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '');
      storagePath = `products/${canonicalId}/${Date.now()}-${sanitizedFileName}`;

      if (supabaseUrl && supabaseKey) {
        try {
          const uploadUrl = `${supabaseUrl}/storage/v1/object/product-images/${storagePath}`;
          const arrayBuffer = await file.arrayBuffer();

          let uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': mimeType || 'image/jpeg',
              'x-upsert': 'true'
            },
            body: arrayBuffer,
            signal: AbortSignal.timeout(3500)
          });

          // Auto-create bucket if not found
          if (uploadRes.status === 404) {
            try {
              await fetch(`${supabaseUrl}/storage/v1/bucket`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: 'product-images', name: 'product-images', public: true }),
                signal: AbortSignal.timeout(2500)
              });

              uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': mimeType || 'image/jpeg',
                  'x-upsert': 'true'
                },
                body: arrayBuffer,
                signal: AbortSignal.timeout(3500)
              });
            } catch (bucketErr) {
              console.warn('Supabase bucket creation retry:', bucketErr);
            }
          }

          if (uploadRes.ok) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
          } else {
            console.warn('Supabase storage upload non-OK status:', uploadRes.status);
          }
        } catch (uploadErr) {
          console.warn('Supabase direct upload warning (fallback to data URL):', uploadErr);
        }
      }

      // If Supabase not configured or timed out, encode directly as base64 data URI
      if (!imageUrl) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          imageUrl = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
        } catch {
          imageUrl = `https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80`;
        }
      }
    } else if (directImageUrl) {
      if (!directImageUrl.startsWith('http://') && !directImageUrl.startsWith('https://') && !directImageUrl.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image URL provided.' },
          { status: 400 }
        );
      }
      imageUrl = directImageUrl;
      storagePath = `products/${canonicalId}/external-${Date.now()}`;
    }

    console.log('[RIDER PHOTO] upload URL generated (length:', imageUrl.length, ')');

    // 5. ATOMIC Database update targeting exactly ONE product row
    const updateResult = await db.updateProductImage(canonicalId, imageUrl);
    if (!updateResult.success) {
      console.error('[RIDER PHOTO] Atomic DB update failed:', updateResult.error);
      return NextResponse.json(
        { error: updateResult.error || 'Product photo upload failed because the database update did not succeed.' },
        { status: 500 }
      );
    }

    console.log('[RIDER PHOTO] rows updated: 1 (SUCCESS)');

    // 6. Insert record in `product_image_history` table
    try {
      await db.query('UPDATE product_image_history SET "isActive" = FALSE WHERE LOWER(TRIM("productId")) = LOWER(TRIM($1))', [canonicalId]);
      const historyId = 'pih-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await db.query(
        `INSERT INTO product_image_history (id, "productId", "storagePath", "imageUrl", "uploadedBy", "uploadedByRole", "uploadedAt", "previousImage", "isActive") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [historyId, canonicalId, storagePath || `products/${canonicalId}`, imageUrl, session.email || session.userId, session.role, new Date().toISOString(), previousImage, true]
      );
      console.log('[RIDER PHOTO] history insert result: SUCCESS');
    } catch (historyErr) {
      console.warn('Non-fatal history logging warning:', historyErr);
    }

    // 7. Log activity in `auditLogs` table
    try {
      const auditUser = session.role === 'delivery_partner' 
        ? `Delivery Partner (${session.email || session.userId})` 
        : `Admin (${session.email || session.userId})`;

      await db.query(
        `INSERT INTO "auditLogs" (id, "adminUser", action, "dateTime", product, "previousValue", "newValue")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['aud-' + Date.now() + '-' + Math.floor(Math.random() * 100), auditUser, 'Product Photo Updated', new Date().toISOString(), rawProduct.name, previousImage, imageUrl]
      );
    } catch (auditErr) {
      console.warn('Non-fatal audit logging warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Product photo updated successfully.',
      productId: canonicalId,
      imageUrl,
      previousImage,
      product: updateResult.product
    });
  } catch (err) {
    console.error('Error handling product photo upload:', err);
    return NextResponse.json(
      { error: 'Server error processing product photo upload.' },
      { status: 500 }
    );
  }
}

