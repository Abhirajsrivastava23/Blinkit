import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerSeed = searchParams.get('seed') === 'true';

    if (triggerSeed) {
      console.log('Explicit database seed trigger received via API.');
      const seedResult = await db.seedDatabase();
      if (!seedResult.success) {
        return NextResponse.json({
          databaseProvider: 'Supabase PostgreSQL',
          seedSuccessful: false,
          error: seedResult.error
        }, { status: 500 });
      }
      return NextResponse.json({
        databaseProvider: 'Supabase PostgreSQL',
        seedSuccessful: true,
        message: seedResult.message
      });
    }

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
