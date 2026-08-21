import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = request.headers.get('x-partner-id') || searchParams.get('partnerId') || '';
    
    if (!partnerId) {
      return NextResponse.json({ error: 'Authorization partnerId required' }, { status: 400 });
    }

    const orders = db.readTable<any>('orders') || [];
    
    // Backend security filter
    const filtered = orders.filter((o: any) => o.assignedPartnerId === partnerId);
    
    return NextResponse.json(filtered);
  } catch (err) {
    console.error('Error fetching delivery orders:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
