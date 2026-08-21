import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export async function GET() {
  try {
    const brands = db.readTable('brands');
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands.' }, { status: 500 });
  }
}
