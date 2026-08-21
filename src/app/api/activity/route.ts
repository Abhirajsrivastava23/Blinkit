import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export async function GET() {
  try {
    const logs = db.readTable('auditLogs');
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
  }
}
