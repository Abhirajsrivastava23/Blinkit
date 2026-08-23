import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const issues = await db.readTable<any>('inventoryIssues') || [];
    return NextResponse.json(issues);
  } catch (err) {
    console.error('Error listing inventory issues:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
