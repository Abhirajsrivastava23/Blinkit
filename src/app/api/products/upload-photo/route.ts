import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';
import { Product } from '../../../../data/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    // 1. Server-side session & role verification
    const session = await getSession(request);
    const userRole = String(session?.role || '').toLowerCase().trim();
    const isAuthorized = ['admin', 'super_admin', 'manager', 'inventory_manager', 'delivery_partner'].includes(userRole);

    if (!session || !isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Delivery Partner authorization required.' },
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

    if (!file && !directImageUrl) {
      return NextResponse.json(
        { error: 'Image file or image URL is required.' },
        { status: 400 }
      );
    }

    const targetProductId = cleanProductId || `prod-upload-${Date.now()}`;
    const isNewProductUpload = targetProductId.startsWith('new-') || targetProductId.startsWith('temp-') || targetProductId.startsWith('prod-upload-');

    // 3. Resolve existing product if not a temporary new product SKU
    let rawProduct: any = null;
    let canonicalId = targetProductId;
    let previousImage = '';

    if (!isNewProductUpload) {
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

      if (rawProduct) {
        canonicalId = String(rawProduct.id || cleanProductId).trim();
        previousImage = rawProduct.image || '';
      }
    }

    let imageUrl = '';
    let storagePath = '';

    // 4. Handle File Upload or Direct Image URL
    if (file) {
      const mimeType = (file.type || '').toLowerCase().trim();
      const fileName = (file.name || '').toLowerCase().trim();
      const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType) || mimeType.startsWith('image/');
      const hasValidExtension = /\.(jpg|jpeg|png|webp|avif|gif|jfif|svg|heic|heif)$/i.test(fileName);

      if (!isAllowedMime && !hasValidExtension && mimeType !== 'application/octet-stream') {
        return NextResponse.json(
          { error: 'Invalid file format. Please upload a standard image (JPEG, PNG, WebP, AVIF, GIF).' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds the 10 MB maximum limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
          { status: 400 }
        );
      }

      // Read buffer ONCE into memory to prevent stream exhaustion
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const sanitizedFileName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '');
      storagePath = `products/${encodeURIComponent(canonicalId)}/${Date.now()}-${sanitizedFileName}`;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const uploadUrl = `${supabaseUrl}/storage/v1/object/product-images/${storagePath}`;

          let uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': mimeType || 'image/jpeg',
              'x-upsert': 'true'
            },
            body: fileBuffer,
            signal: AbortSignal.timeout(4000)
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
                body: fileBuffer,
                signal: AbortSignal.timeout(4000)
              });
            } catch (bucketErr) {
              console.warn('Supabase bucket creation warning:', bucketErr);
            }
          }

          if (uploadRes.ok) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
          } else {
            console.warn('Supabase storage upload non-OK status:', uploadRes.status);
          }
        } catch (uploadErr) {
          console.warn('Supabase direct upload warning (fallback to optimized data URI):', uploadErr);
        }
      }

      // Safe base64 data URI fallback if Supabase not configured or failed
      if (!imageUrl) {
        const detectedMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
        imageUrl = `data:${detectedMime};base64,${fileBuffer.toString('base64')}`;
      }
    } else if (directImageUrl) {
      if (
        !directImageUrl.startsWith('http://') &&
        !directImageUrl.startsWith('https://') &&
        !directImageUrl.startsWith('data:image/') &&
        !directImageUrl.startsWith('/')
      ) {
        return NextResponse.json(
          { error: 'Invalid image URL provided.' },
          { status: 400 }
        );
      }
      imageUrl = directImageUrl;
      storagePath = `products/${encodeURIComponent(canonicalId)}/external-${Date.now()}`;
    }

    // 5. If this is for an existing product, update database & history
    let updatedProductResult: Product | undefined = undefined;

    if (rawProduct) {
      const updateResult = await db.updateProductImage(canonicalId, imageUrl);
      if (!updateResult.success) {
        console.error('[PHOTO UPLOAD] DB update warning:', updateResult.error);
      } else {
        updatedProductResult = updateResult.product;
      }

      // Record in product_image_history table
      try {
        await db.query('UPDATE product_image_history SET "isActive" = FALSE WHERE LOWER(TRIM("productId")) = LOWER(TRIM($1))', [canonicalId]).catch(() => {});
        const historyId = 'pih-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        await db.query(
          `INSERT INTO product_image_history (id, "productId", "storagePath", "imageUrl", "uploadedBy", "uploadedByRole", "uploadedAt", "previousImage", "isActive") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [historyId, canonicalId, storagePath || `products/${canonicalId}`, imageUrl, session.email || session.userId, userRole, new Date().toISOString(), previousImage, true]
        ).catch(() => {});
      } catch (historyErr) {
        console.warn('Non-fatal history logging warning:', historyErr);
      }

      // Log in auditLogs table
      try {
        const auditUser = userRole === 'delivery_partner' 
          ? `Delivery Partner (${session.email || session.userId})` 
          : `Admin (${session.email || session.userId})`;

        await db.query(
          `INSERT INTO "auditLogs" (id, "adminUser", action, "dateTime", product, "previousValue", "newValue")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['aud-' + Date.now() + '-' + Math.floor(Math.random() * 100), auditUser, 'Product Photo Updated', new Date().toISOString(), rawProduct.name || canonicalId, previousImage, imageUrl]
        ).catch(() => {});
      } catch (auditErr) {
        console.warn('Non-fatal audit logging warning:', auditErr);
      }

      // Revalidate storefront & product routes
      try {
        revalidatePath('/');
        revalidatePath('/products');
        revalidatePath('/api/products');
        revalidatePath(`/product/${encodeURIComponent(canonicalId)}`);
        if (rawProduct?.category) {
          revalidatePath(`/${rawProduct.category}`);
        }
      } catch (revalidateErr) {
        console.warn('Non-fatal revalidation warning:', revalidateErr);
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Product photo processed successfully.',
        productId: canonicalId,
        imageUrl,
        previousImage,
        product: updatedProductResult
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (err) {
    console.error('Error handling product photo upload:', err);
    return NextResponse.json(
      { error: 'Server error processing product photo upload.' },
      { status: 500 }
    );
  }
}
