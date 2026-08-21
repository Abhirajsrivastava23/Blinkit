import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, updates } = body;
    
    if (!id || !updates) {
      return NextResponse.json({ error: 'Order id and updates are required' }, { status: 400 });
    }

    const orders = db.readTable<any>('orders') || [];
    const idx = orders.findIndex((o: any) => o.id === id);
    
    if (idx === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    orders[idx] = {
      ...orders[idx],
      ...updates
    };
    
    db.writeTable('orders', orders);
    return NextResponse.json({ success: true, order: orders[idx] });
  } catch (err) {
    console.error('Error updating order on server:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
