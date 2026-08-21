import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { Product } from '../../../../data/mockData';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const products = db.readTable<Product>('products');
    const product = products.find(p => p.id === id || p.name.toLowerCase().replace(/ /g, '-') === id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Server-side security check for Wellness 18+ Access
    if (product.category === 'wellness') {
      const userEmail = request.headers.get('x-user-email') || '';
      const users = db.readTable<any>('users') || [];
      const userObj = users.find((u: any) => u.email === userEmail);
      
      if (!userObj || userObj.wellnessAccessStatus !== 'APPROVED') {
        return new NextResponse(
          JSON.stringify({ error: '403 Forbidden: Approved Wellness profile required.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
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
    const body = await request.json();
    const products = db.readTable<Product>('products');
    const idx = products.findIndex(p => p.id === id || p.name.toLowerCase().replace(/ /g, '-') === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const prevProduct = products[idx];
    const auditLogs: string[] = [];

    // Form modifications checks
    if (body.name && body.name !== prevProduct.name) {
      auditLogs.push(`Name: "${prevProduct.name}" -> "${body.name}"`);
    }
    if (body.price !== undefined && Number(body.price) !== prevProduct.price) {
      auditLogs.push(`Price: ₹${prevProduct.price} -> ₹${body.price}`);
    }
    if (body.inStock !== undefined && body.inStock !== prevProduct.inStock) {
      auditLogs.push(`Stock status: ${prevProduct.inStock ? 'In Stock' : 'Out of Stock'} -> ${body.inStock ? 'In Stock' : 'Out of Stock'}`);
    }
    if (body.wellnessVerified !== undefined && body.wellnessVerified !== prevProduct.wellnessVerified) {
      auditLogs.push(`Verified status: ${prevProduct.wellnessVerified ? 'Yes' : 'No'} -> ${body.wellnessVerified ? 'Yes' : 'No'}`);
    }

    // Merge modifications
    const updatedProduct: Product = {
      ...prevProduct,
      ...body,
      // Recalculate discount
      discount: body.originalPrice || body.price 
        ? Math.round(((Number(body.originalPrice || prevProduct.originalPrice) - Number(body.price || prevProduct.price)) / Number(body.originalPrice || prevProduct.originalPrice)) * 100)
        : prevProduct.discount,
      wellnessDetails: prevProduct.category === 'wellness' || body.category === 'wellness' ? {
        material: body.wellnessMaterial || prevProduct.wellnessMaterial || 'Latex',
        lubrication: body.wellnessTexture === 'Smooth' ? 'Silicone Lubricated' : 'Textured Rib/Dot Oil',
        texture: body.wellnessTexture || prevProduct.wellnessTexture || 'Smooth',
        sizeFit: '53mm Nominal Width',
        flavor: body.wellnessFlavor || prevProduct.wellnessFlavor,
        storage: body.storageInstructions || prevProduct.storageInstructions,
        manufacturer: body.manufacturer || prevProduct.wellnessDetails?.manufacturer || 'FATAFAT Sourced Manufacturer'
      } : undefined
    };

    products[idx] = updatedProduct;
    db.writeTable('products', products);

    // Write audit log entry
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
    const products = db.readTable<Product>('products');
    const idx = products.findIndex(p => p.id === id || p.name.toLowerCase().replace(/ /g, '-') === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const productToDelete = products[idx];

    // Delete or Archive check:
    // In our local DB structure we can just filter it out. To simulate order-linked delete protection,
    // we can either set isArchived: true or delete directly since we are in dev.
    // Let's archive it by toggling inStock: false and wellnessVerified: false (hidden) or splice it out.
    // We will splice it out to keep the mock lists clean.
    const deletedName = productToDelete.name;
    products.splice(idx, 1);
    db.writeTable('products', products);

    // Audit Log
    db.logActivity('Admin Console', 'Deleted Product', deletedName, 'Active SKU', 'Removed from database');

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product from database:', error);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}
