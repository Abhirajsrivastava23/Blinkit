import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';
import { Product } from '../../../../data/mockData';

export async function POST(request: Request) {
  try {
    // 1. Server-side session & role verification (Admin only for image restoration)
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authorization required for image restoration.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId, imageHistoryId } = body;

    if (!productId || !imageHistoryId) {
      return NextResponse.json(
        { error: 'Product ID and image history ID are required.' },
        { status: 400 }
      );
    }

    // 2. Get the history record to restore
    let historyRecord: any = null;
    try {
      const historyResult = await db.query(
        'SELECT * FROM product_image_history WHERE id = $1 AND "productId" = $2',
        [imageHistoryId, productId]
      );
      if (historyResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Image history record not found.' },
          { status: 404 }
        );
      }
      historyRecord = historyResult.rows[0];
    } catch (err) {
      console.warn('History query error:', err);
      return NextResponse.json(
        { error: 'Failed to retrieve image history.' },
        { status: 500 }
      );
    }

    // 3. Validate product existence
    const products = await db.readTable<Product>('products') || [];
    const productIdx = products.findIndex(p => p.id === productId);

    if (productIdx === -1) {
      return NextResponse.json(
        { error: `Product not found with ID: ${productId}` },
        { status: 404 }
      );
    }

    const product = products[productIdx];
    const currentImage = product.image || '';

    // 4. Restore the image atomically
    const restoredImageUrl = historyRecord.imageUrl;
    const updateResult = await db.updateProductImage(productId, restoredImageUrl);
    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Failed to update product image in database.' },
        { status: 500 }
      );
    }

    // 5. Update image history - mark the restored image as active
    try {
      // First, deactivate all history records for this product
      await db.query(
        'UPDATE product_image_history SET "isActive" = FALSE WHERE "productId" = $1',
        [productId]
      );

      // Now activate the restored record
      await db.query(
        'UPDATE product_image_history SET "isActive" = TRUE WHERE id = $1',
        [imageHistoryId]
      );

      // Create a new history entry documenting the restoration
      const restorationHistoryId = 'pih-restore-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await db.query(
        `INSERT INTO product_image_history (id, "productId", "storagePath", "imageUrl", "uploadedBy", "uploadedByRole", "uploadedAt", "previousImage", "isActive") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          restorationHistoryId,
          productId,
          historyRecord.storagePath || `products/${productId}/restored`,
          restoredImageUrl,
          session.email || session.userId,
          'admin',
          new Date().toISOString(),
          currentImage,
          true
        ]
      );
    } catch (historyErr) {
      console.warn('Non-fatal history update warning:', historyErr);
    }

    // 6. Log activity in `auditLogs` table
    try {
      await db.query(
        `INSERT INTO "auditLogs" (id, "adminUser", action, "dateTime", product, "previousValue", "newValue")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'aud-restore-' + Date.now() + '-' + Math.floor(Math.random() * 100),
          `Admin (${session.email || session.userId})`,
          'Product Image Restored',
          new Date().toISOString(),
          product.name,
          currentImage,
          restoredImageUrl
        ]
      );
    } catch (auditErr) {
      console.warn('Non-fatal audit logging warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Product image restored successfully.',
      productId,
      restoredImageUrl,
      previousImage: currentImage
    });
  } catch (err) {
    console.error('Error handling product image restoration:', err);
    return NextResponse.json(
      { error: 'Server error processing product image restoration.' },
      { status: 500 }
    );
  }
}
