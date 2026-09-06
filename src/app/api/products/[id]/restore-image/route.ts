import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '../../../../../data/db';
import { getSession } from '../../../../../data/auth';
import { Product } from '../../../../../data/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, context: any) {
  try {
    // 1. Admin authorization check
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authorization required to restore product images.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { historyId, targetImageUrl } = body;

    // 2. Fetch product from PostgreSQL
    const products = await db.readTable<Product>('products') || [];
    const productIdx = products.findIndex(p => p.id === id);

    if (productIdx === -1) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const product = products[productIdx];
    const previousImage = product.image || '';
    let restoredUrl = targetImageUrl || '';

    // 3. Resolve target image from history if historyId provided
    if (historyId) {
      const historyRes = await db.query(
        'SELECT * FROM product_image_history WHERE id = $1 AND "productId" = $2 LIMIT 1',
        [historyId, id]
      );
      if (historyRes.rows.length > 0) {
        restoredUrl = (historyRes.rows[0] as any).imageUrl;
      }
    }

    // If still empty, find the most recent previous image from history
    if (!restoredUrl) {
      const latestHistoryRes = await db.query(
        'SELECT * FROM product_image_history WHERE "productId" = $1 AND "imageUrl" != $2 ORDER BY "uploadedAt" DESC LIMIT 1',
        [id, previousImage]
      );
      if (latestHistoryRes.rows.length > 0) {
        restoredUrl = (latestHistoryRes.rows[0] as any).imageUrl;
      } else {
        return NextResponse.json(
          { error: 'No previous image history found to restore for this product.' },
          { status: 400 }
        );
      }
    }

    // 4. Update products table atomically
    const updateResult = await db.updateProductImage(id, restoredUrl);
    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Failed to update product image in database.' },
        { status: 500 }
      );
    }

    // 5. Update history status
    try {
      await db.query('UPDATE product_image_history SET "isActive" = FALSE WHERE "productId" = $1', [id]);
      if (historyId) {
        await db.query('UPDATE product_image_history SET "isActive" = TRUE WHERE id = $1', [historyId]);
      } else {
        await db.query('UPDATE product_image_history SET "isActive" = TRUE WHERE "productId" = $1 AND "imageUrl" = $2', [id, restoredUrl]);
      }
    } catch (historyErr) {
      console.warn('Non-fatal history status update warning:', historyErr);
    }

    // 6. Log to audit trail
    try {
      await db.query(
        `INSERT INTO "auditLogs" (id, "adminUser", action, "dateTime", product, "previousValue", "newValue")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['aud-' + Date.now() + '-' + Math.floor(Math.random() * 100), `Admin (${session.email || session.userId})`, 'Product Photo Restored', new Date().toISOString(), product.name, previousImage, restoredUrl]
      );
    } catch (auditErr) {
      console.warn('Non-fatal audit logging warning:', auditErr);
    }

    // 7. Revalidate Next.js cache paths
    try {
      revalidatePath('/');
      revalidatePath('/products');
      revalidatePath('/api/products');
      revalidatePath(`/product/${encodeURIComponent(id)}`);
      if (product.category) {
        revalidatePath(`/${product.category}`);
      }
    } catch {}

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Product image restored successfully.',
        productId: id,
        imageUrl: restoredUrl,
        previousImage
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (err) {
    console.error('Error restoring product image:', err);
    return NextResponse.json(
      { error: 'Server error restoring product image.' },
      { status: 500 }
    );
  }
}
