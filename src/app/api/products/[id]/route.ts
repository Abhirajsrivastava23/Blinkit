import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const cleanId = decodeURIComponent(String(id || '')).trim();
    const product = await db.getProductById(cleanId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Server-side security check for Wellness 18+ Access & Publication state
    if (product.category === 'wellness') {
      const wellnessSettings = await db.getWellnessSettings();
      const session = await getSession(request);
      const isAdmin = session && session.role === 'admin';

      if (!wellnessSettings.published && !isAdmin) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      if (!isAdmin) {
        const userEmail = request.headers.get('x-user-email') || '';
        const users = await db.readTable<any>('users') || [];
        const userObj = users.find((u: any) => u.email === userEmail);
        
        if (!userObj || (userObj.wellnessAccessStatus !== 'APPROVED' && userObj.wellnessAccessStatus !== 'ACTIVE')) {
          return new NextResponse(
            JSON.stringify({ error: '403 Forbidden: Approved Wellness profile required.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new NextResponse(JSON.stringify(product), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json({ error: 'Failed to fetch product.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    // 1. Server-side session & role verification (Admin or Delivery Partner)
    const session = await getSession(request);
    if (!session || (session.role !== 'admin' && session.role !== 'delivery_partner')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Delivery Partner authorization required to modify products.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const cleanId = decodeURIComponent(String(id || '')).trim();
    const body = await request.json();

    const prevProduct = await db.getProductById(cleanId);
    if (!prevProduct) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Block delivery partner from changing price or sensitive attributes
    if (session.role === 'delivery_partner') {
      const allowedKeys = ['image', 'gallery', 'inStock'];
      for (const k of Object.keys(body)) {
        if (!allowedKeys.includes(k)) {
          return NextResponse.json(
            { error: `Access Denied: Delivery partners can only update product image or availability.` },
            { status: 403 }
          );
        }
      }
    }

    const updatedProduct = await db.updateProduct(prevProduct.id, body);
    if (!updatedProduct) {
      return NextResponse.json({ error: 'Failed to update product in database.' }, { status: 500 });
    }

    // Next.js Route Cache Invalidation
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/');
      revalidatePath('/products');
      revalidatePath('/api/products');
      revalidatePath('/birthday-cakes');
      revalidatePath('/chocolate-cakes');
      revalidatePath('/pastries');
      revalidatePath('/beer-theme-cakes');
      revalidatePath('/desserts');
      revalidatePath('/wellness');
      revalidatePath('/search');
      revalidatePath(`/product/${encodeURIComponent(prevProduct.id)}`);
      revalidatePath(`/product/${encodeURIComponent(cleanId)}`);
      if (updatedProduct.category) {
        revalidatePath(`/${updatedProduct.category}`);
      }
    } catch {
      // ignore in environments where revalidatePath is no-op
    }

    // Audit Log
    const auditLogs: string[] = [];
    if (body.name && body.name !== prevProduct.name) {
      auditLogs.push(`Name: "${prevProduct.name}" -> "${body.name}"`);
    }
    if (body.price !== undefined && Number(body.price) !== prevProduct.price) {
      auditLogs.push(`Price: ₹${prevProduct.price} -> ₹${body.price}`);
    }
    if (body.inStock !== undefined && body.inStock !== prevProduct.inStock) {
      auditLogs.push(`Stock: ${prevProduct.inStock ? 'In Stock' : 'Out of Stock'} -> ${body.inStock ? 'In Stock' : 'Out of Stock'}`);
    }
    if (body.image && body.image !== prevProduct.image) {
      auditLogs.push(`Image updated`);
    }

    if (auditLogs.length > 0) {
      const actor = session.role === 'delivery_partner' ? `Delivery Partner (${session.email || session.userId})` : (session.email || 'Admin Console');
      db.logActivity(actor, 'Updated Product', prevProduct.name, auditLogs.join(', '), 'Success');
    }

    return new NextResponse(
      JSON.stringify({ success: true, product: updatedProduct }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error updating product details:', error);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    // Server-side session & role verification (Admin only)
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authorization required to delete products.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const cleanId = decodeURIComponent(String(id || '')).trim();
    const existing = await db.getProductById(cleanId);

    if (!existing) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const deleted = await db.deleteProduct(existing.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
    }

    try {
      revalidatePath('/');
      revalidatePath('/products');
      revalidatePath('/api/products');
      revalidatePath(`/product/${encodeURIComponent(existing.id)}`);
      if (existing.category) {
        revalidatePath(`/${existing.category}`);
      }
    } catch {
      // ignore
    }

    // Audit Log
    db.logActivity(session.email || 'Admin Console', 'Deleted Product', existing.name, 'Active SKU', 'Removed from database');

    return new NextResponse(
      JSON.stringify({ success: true, message: 'Product deleted successfully.' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error deleting product from database:', error);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}
