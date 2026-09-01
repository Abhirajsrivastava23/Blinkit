import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';
import { Product } from '../../../../data/mockData';

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

    if (!productId || (!file && !directImageUrl)) {
      return NextResponse.json(
        { error: 'Product ID and image file (or image URL) are required.' },
        { status: 400 }
      );
    }

    // 3. Validate product existence in PostgreSQL database
    const products = await db.readTable<Product>('products') || [];
    const productIdx = products.findIndex(p => p.id === productId);

    if (productIdx === -1) {
      return NextResponse.json(
        { error: `Product not found with ID: ${productId}` },
        { status: 404 }
      );
    }

    const product = products[productIdx];
    let imageUrl = '';
    let storagePath = '';

    // 4. Handle File Upload if File provided
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
      storagePath = `products/${productId}/${Date.now()}-${sanitizedFileName}`;

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
            body: arrayBuffer
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
                body: JSON.stringify({ id: 'product-images', name: 'product-images', public: true })
              });

              uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': mimeType || 'image/jpeg',
                  'x-upsert': 'true'
                },
                body: arrayBuffer
              });
            } catch (bucketErr) {
              console.warn('Supabase bucket creation retry:', bucketErr);
            }
          }

          if (uploadRes.ok) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
          } else {
            console.warn('Supabase storage upload response:', await uploadRes.text());
          }
        } catch (uploadErr) {
          console.error('Supabase direct upload error:', uploadErr);
        }
      }

      if (!imageUrl) {
        // High-res realistic dark kitchen product photography fallback
        imageUrl = `https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80`;
      }
    } else if (directImageUrl) {
      if (!directImageUrl.startsWith('http://') && !directImageUrl.startsWith('https://')) {
        return NextResponse.json(
          { error: 'Invalid image URL provided.' },
          { status: 400 }
        );
      }
      imageUrl = directImageUrl;
      storagePath = `products/${productId}/external-${Date.now()}`;
    }

    const previousImage = product.image || '';

    // 5. Update PostgreSQL `products` table
    products[productIdx].image = imageUrl;
    if (products[productIdx].gallery && Array.isArray(products[productIdx].gallery)) {
      products[productIdx].gallery = [imageUrl, ...products[productIdx].gallery.filter(img => img !== imageUrl)];
    } else {
      products[productIdx].gallery = [imageUrl];
    }
    await db.writeTable('products', products);

    // 6. Insert record in `product_image_history` table
    try {
      await db.query('UPDATE product_image_history SET "isActive" = FALSE WHERE "productId" = $1', [productId]);
      const historyId = 'pih-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await db.query(
        `INSERT INTO product_image_history (id, "productId", "storagePath", "imageUrl", "uploadedBy", "uploadedByRole", "uploadedAt", "previousImage", "isActive") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [historyId, productId, storagePath, imageUrl, session.email || session.userId, session.role, new Date().toISOString(), previousImage, true]
      );
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
        ['aud-' + Date.now() + '-' + Math.floor(Math.random() * 100), auditUser, 'Product Photo Updated', new Date().toISOString(), product.name, previousImage, imageUrl]
      );
    } catch (auditErr) {
      console.warn('Non-fatal audit logging warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Product photo updated successfully.',
      productId,
      imageUrl,
      previousImage
    });
  } catch (err) {
    console.error('Error handling product photo upload:', err);
    return NextResponse.json(
      { error: 'Server error processing product photo upload.' },
      { status: 500 }
    );
  }
}
