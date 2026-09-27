import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { getSession, validateRole } from '../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const isAdmin = session && (session.role === 'admin' || session.role === 'super_admin');
    const wellnessSettings = await db.getWellnessSettings();

    let categories = await db.readTable<any>('categories') || [];
    if (!wellnessSettings.published && !isAdmin) {
      categories = categories.filter((c: any) => c.id !== 'wellness' && c.slug !== 'wellness');
    }
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authorization required to create categories.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, description, image, status, seoTitle, seoDescription } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing category name or slug.' }, { status: 400 });
    }

    const categories = await db.readTable<any>('categories') || [];
    const isExists = categories.some((c: any) => c.slug === slug);
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
    await db.writeTable('categories', categories);

    db.logActivity(adminSession.email || 'Admin Console', 'Added Category', name, 'N/A', `Slug: ${slug}`);

    return NextResponse.json({ success: true, category: newCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    return NextResponse.json({ error: 'Failed to add category.' }, { status: 500 });
  }
}

