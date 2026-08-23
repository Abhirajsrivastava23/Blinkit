import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const startTime = Date.now();
    const testDb = await db.testConnection();
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      databaseProvider: 'Supabase PostgreSQL',
      connectionStatus: testDb.ok ? 'connected' : 'failed',
      connectionSuccessful: testDb.ok,
      serverEnvironment: process.env.NODE_ENV || 'production',
      latency: `${latency}ms`,
      error: testDb.ok ? null : testDb.error
    });
  } catch (err: any) {
    return NextResponse.json({
      databaseProvider: 'Supabase PostgreSQL',
      connectionStatus: 'failed',
      connectionSuccessful: false,
      serverEnvironment: process.env.NODE_ENV || 'production',
      latency: 'unknown',
      error: err.message || String(err)
    }, { status: 500 });
  }
}
