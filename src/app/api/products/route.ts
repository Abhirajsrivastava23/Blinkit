import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '../../../data/db';
import { Product } from '../../../data/mockData';
import { getSession } from '../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const wellnessType = searchParams.get('wellnessType') || '';
    const wellness = searchParams.get('wellness'); // 'true' or 'false'
    const featured = searchParams.get('featured'); // 'true' or 'false'
    const stockStatus = searchParams.get('stockStatus'); // 'low', 'out', 'in'

    // Load storefront settings
    const wellnessSettings = await db.getWellnessSettings();
    const wellnessPublished = wellnessSettings.published;

    // Server-side security check for Wellness 18+ Access
    const isWellnessReq = wellness === 'true' || category === 'wellness';
    if (isWellnessReq) {
      const session = await getSession(request);
      const isAdmin = session && session.role === 'admin';

      if (!wellnessPublished && !isAdmin) {
        return new NextResponse(
          JSON.stringify({ error: '403 Forbidden: Wellness storefront is currently unpublished.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
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

    let products = await db.readTable<Product>('products');
    
    // Force exclude wellness products if storefront is unpublished and requester is not admin
    const session = await getSession(request);
    const isAdmin = session && session.role === 'admin';
    if (!wellnessPublished && !isAdmin) {
      products = products.filter(p => p.category !== 'wellness');
    }

    // Filter by store category (Wellness vs normal store)
    if (wellness === 'true') {
      products = products.filter(p => p.category === 'wellness');
    } else if (wellness === 'false') {
      products = products.filter(p => p.category !== 'wellness');
    }

    // Filter by standard category key
    if (category && category !== 'All') {
      // Normal category key or wellness brand/type
      if (category === 'wellness') {
        products = products.filter(p => p.category === 'wellness');
      } else {
        products = products.filter(p => p.category === category || p.wellnessType === category);
      }
    }

    // Filter by wellness subcategory type
    if (wellnessType && wellnessType !== 'All') {
      products = products.filter(p => p.wellnessType === wellnessType);
    }

    // Filter by brand
    if (brand && brand !== 'All') {
      products = products.filter(p => p.wellnessBrand === brand);
    }

    // Search Query (name, description, SKU, brand)
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      products = products.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.wellnessBrand && p.wellnessBrand.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q) ||
          (p.wellnessSku && p.wellnessSku.toLowerCase().includes(q))
      );
    }

    // Filter by Featured
    if (featured === 'true') {
      // We check tags or properties
      products = products.filter(p => p.rating >= 4.8);
    }

    // Filter by stock status
    if (stockStatus === 'out') {
      products = products.filter(p => !p.inStock);
    } else if (stockStatus === 'low') {
      // Out of stock or low review count (simulating low stock alert threshold)
      products = products.filter(p => p.inStock && p.reviewCount < 100);
    } else if (stockStatus === 'in') {
      products = products.filter(p => p.inStock);
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products from database:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, price, category, image } = body;

    // Validation
    if (!name || price === undefined || price === null || !category || !image) {
      return NextResponse.json({ error: 'Missing mandatory fields: name, price, category, or image.' }, { status: 400 });
    }

    const newProduct = await db.createProduct(body);

    // Revalidate Storefront Routes
    try {
      revalidatePath('/');
      revalidatePath('/products');
      if (newProduct.category) {
        revalidatePath(`/${newProduct.category}`);
      }
    } catch {
      // ignore
    }

    // Audit Log
    db.logActivity(
      'Admin Console',
      'Added Product',
      newProduct.name,
      'N/A',
      `ID: ${newProduct.id}, Price: ₹${newProduct.price}`
    );

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error) {
    console.error('Error creating product in database:', error);
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}
