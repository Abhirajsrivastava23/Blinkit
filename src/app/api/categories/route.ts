import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export async function GET() {
  try {
    const categories = db.readTable('categories');
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description, image, status, seoTitle, seoDescription } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing category name or slug.' }, { status: 400 });
    }

    const categories = db.readTable<any>('categories');
    const isExists = categories.some(c => c.slug === slug);
    if (isExists) {
      return NextResponse.json({ error: 'Category slug must be unique.' }, { status: 400 });
    }

    const newCategory = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      description: description || '',
      image: image || '',
      status: status || 'Active',
      seoTitle: seoTitle || name,
      seoDescription: seoDescription || description || ''
    };

    categories.push(newCategory);
    db.writeTable('categories', categories);

    db.logActivity('Admin Console', 'Added Category', name, 'N/A', `Slug: ${slug}`);

    return NextResponse.json({ success: true, category: newCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    return NextResponse.json({ error: 'Failed to add category.' }, { status: 500 });
  }
}
