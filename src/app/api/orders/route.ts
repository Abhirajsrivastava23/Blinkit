import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export async function GET() {
  try {
    const list = db.readTable<any>('orders') || [];
    return NextResponse.json(list);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orders = db.readTable<any>('orders') || [];
    
    // Check if order already exists
    const idx = orders.findIndex((o: any) => o.id === body.id);
    if (idx > -1) {
      orders[idx] = body;
    } else {
      orders.unshift(body);
    }
    
    db.writeTable('orders', orders);
    return NextResponse.json(body);
  } catch (err) {
    console.error('Error saving order:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
