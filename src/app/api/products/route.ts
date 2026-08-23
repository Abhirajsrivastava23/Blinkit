import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { Product } from '../../../data/mockData';

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

    // Server-side security check for Wellness 18+ Access
    const isWellnessReq = wellness === 'true' || category === 'wellness';
    if (isWellnessReq) {
      const userEmail = request.headers.get('x-user-email') || '';
      const users = await db.readTable<any>('users') || [];
      const userObj = users.find((u: any) => u.email === userEmail);
      
      if (!userObj || userObj.wellnessAccessStatus !== 'APPROVED') {
        return new NextResponse(
          JSON.stringify({ error: '403 Forbidden: Approved Wellness profile required.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    let products = await db.readTable<Product>('products');

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
    const {
      name, price, originalPrice, category, description, image, 
      wellnessBrand, wellnessType, wellnessMaterial, wellnessPackSize, 
      wellnessTexture, wellnessFlavor, wellnessVerified, storageInstructions, 
      deliveryTime, inStock, variants
    } = body;

    // Validation
    if (!name || !price || !category || !image) {
      return NextResponse.json({ error: 'Missing mandatory fields: name, price, category, or image.' }, { status: 400 });
    }

    const products = await db.readTable<Product>('products');
    
    // Auto-generate safe slug and SKU
    const slug = name.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const isSlugExists = products.some(p => p.id === slug || p.name.toLowerCase().replace(/ /g, '-') === slug);
    const generatedId = isSlugExists ? `${slug}-${Date.now().toString().slice(-4)}` : slug;
    
    const brandPrefix = wellnessBrand ? wellnessBrand.substring(0,3).toUpperCase() : 'VM';
    const generatedSku = `SKU-${brandPrefix}-${Date.now().toString().slice(-5)}`;

    const newProduct: Product = {
      id: generatedId,
      name,
      category,
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      discount: originalPrice ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100) : 0,
      rating: 4.5,
      reviewCount: 0,
      image,
      deliveryTime: deliveryTime || '30-45 mins',
      inStock: inStock !== undefined ? inStock : true,
      description,
      ingredients: wellnessMaterial ? [wellnessMaterial] : ['Premium Ingredients'],
      allergens: ['Standard warnings apply'],
      storageInstructions: storageInstructions || 'Store fresh.',
      occasions: ['Just Because'],
      variants: variants && variants.length > 0 ? variants : ['Standard'],
      wellnessBrand,
      wellnessType,
      wellnessMaterial,
      wellnessPackSize,
      wellnessTexture,
      wellnessFlavor: wellnessFlavor || undefined,
      wellnessVerified: wellnessVerified !== undefined ? wellnessVerified : true,
      wellnessSku: generatedSku,
      wellnessDetails: category === 'wellness' ? {
        material: wellnessMaterial || 'Latex',
        lubrication: 'Silicone Lubrication',
        texture: wellnessTexture || 'Smooth',
        sizeFit: '53mm Nominal Width',
        flavor: wellnessFlavor || undefined,
        storage: storageInstructions || 'Store cool.',
        manufacturer: 'FATAFAT Sourced Manufacturer'
      } : undefined,
      gallery: [image]
    };

    products.push(newProduct);
    await db.writeTable('products', products);

    // Audit Log
    db.logActivity('Admin Console', 'Added Product', name, 'N/A', `SKU: ${generatedSku}, Price: ₹${price}`);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creating product in database:', error);
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}
