import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';

export async function GET(request: Request) {
  try {
    const users = await db.readTable<any>('users') || [];
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
