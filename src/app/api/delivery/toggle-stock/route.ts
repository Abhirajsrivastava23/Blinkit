import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';
import { Product } from '../../../../data/mockData';

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

    const products = await db.readTable<Product>('products') || [];
    const idx = products.findIndex(p => p.id === productId);

    if (idx === -1) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const product = products[idx];

    // Block toggling Wellness catalog products for delivery partners
    if (product.category === 'wellness' && session.role === 'delivery_partner') {
      return NextResponse.json({ error: 'Access Denied: Delivery partners cannot manage Wellness inventory.' }, { status: 403 });
    }

    const prevInStock = product.inStock;
    product.inStock = !!inStock;
    products[idx] = product;
    await db.writeTable('products', products);

    // Save event to audit log table
    const auditLogs = await db.readTable<any>('auditLogs') || [];
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
      newValue: product.inStock ? 'Available' : 'Sold Out'
    };
    auditLogs.push(auditEvent);
    await db.writeTable('auditLogs', auditLogs);

    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error('Error toggling product stock availability:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
