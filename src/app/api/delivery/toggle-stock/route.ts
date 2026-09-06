import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';
import { Product } from '../../../../data/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'delivery_partner' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized operational access required.' }, { status: 401 });
    }

    const { productId, inStock } = await request.json();
    if (!productId || inStock === undefined) {
      return NextResponse.json({ error: 'Product ID and inStock boolean are required.' }, { status: 400 });
    }

    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Block toggling Wellness catalog products for delivery partners
    if (product.category === 'wellness' && session.role === 'delivery_partner') {
      return NextResponse.json({ error: 'Access Denied: Delivery partners cannot manage Wellness inventory.' }, { status: 403 });
    }

    const prevInStock = product.inStock;
    const updatedProduct = await db.updateProduct(product.id, { inStock: !!inStock });

    // Save event to audit log table
    const auditEvent = {
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 100),
      userId: session.userId,
      userEmail: session.email || 'partner@fatafat.com',
      userName: session.role === 'admin' ? 'FATAFAT Super Admin' : `Rider: ${session.userId}`,
      action: 'Toggle Product Availability',
      adminId: session.userId,
      timestamp: new Date().toISOString(),
      product: product.name,
      previousValue: prevInStock ? 'Available' : 'Sold Out',
      newValue: inStock ? 'Available' : 'Sold Out'
    };

    try {
      await db.query(
        `INSERT INTO "auditLogs" (id, "adminUser", action, "dateTime", product, "previousValue", "newValue")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [auditEvent.id, auditEvent.userName, auditEvent.action, auditEvent.timestamp, auditEvent.product, auditEvent.previousValue, auditEvent.newValue]
      );
    } catch {}

    // Revalidate paths
    try {
      revalidatePath('/');
      revalidatePath('/products');
      revalidatePath('/api/products');
      revalidatePath(`/product/${encodeURIComponent(product.id)}`);
      if (product.category) {
        revalidatePath(`/${product.category}`);
      }
    } catch {}

    return new NextResponse(
      JSON.stringify({ success: true, product: updatedProduct || { ...product, inStock: !!inStock } }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (err) {
    console.error('Error toggling product stock availability:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
