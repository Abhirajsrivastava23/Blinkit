import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const categories = db.readTable<any>('categories');
    const idx = categories.findIndex(c => c.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    const prev = categories[idx];
    const updated = {
      ...prev,
      ...body
    };

    categories[idx] = updated;
    db.writeTable('categories', categories);

    db.logActivity('Admin Console', 'Updated Category', prev.name, `Status: ${prev.status}`, `Status: ${updated.status}`);

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const categories = db.readTable<any>('categories');
    const idx = categories.findIndex(c => c.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    const name = categories[idx].name;
    categories.splice(idx, 1);
    db.writeTable('categories', categories);

    db.logActivity('Admin Console', 'Deleted Category', name, 'Active Category', 'Removed');

    return NextResponse.json({ success: true, message: 'Category deleted.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category.' }, { status: 500 });
  }
}
