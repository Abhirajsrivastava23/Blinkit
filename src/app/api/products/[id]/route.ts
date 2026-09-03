import { NextResponse } from 'next/server';
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

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json({ error: 'Failed to fetch product.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const cleanId = decodeURIComponent(String(id || '')).trim();
    const body = await request.json();

    const prevProduct = await db.getProductById(cleanId);
    if (!prevProduct) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const updatedProduct = await db.updateProduct(prevProduct.id, body);
    if (!updatedProduct) {
      return NextResponse.json({ error: 'Failed to update product in database.' }, { status: 500 });
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

    if (auditLogs.length > 0) {
      db.logActivity('Admin Console', 'Updated Product', prevProduct.name, auditLogs.join(', '), 'Success');
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Error updating product details:', error);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
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

    // Audit Log
    db.logActivity('Admin Console', 'Deleted Product', existing.name, 'Active SKU', 'Removed from database');

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product from database:', error);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}
