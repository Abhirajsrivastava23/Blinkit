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

    const connectionString = (
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      ''
    ).trim();

    let host = 'unknown';
    let port = 'unknown';
    let envVarUsed = 'none';

    if (process.env.POSTGRES_URL) {
      envVarUsed = 'POSTGRES_URL';
    } else if (process.env.DATABASE_URL) {
      envVarUsed = 'DATABASE_URL';
    }

    if (connectionString) {
      try {
        const parsedUrl = new URL(connectionString);
        host = parsedUrl.hostname;
        port = parsedUrl.port || '5432';
      } catch {
        host = 'invalid-url';
      }
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
      envVarUsed,
      host,
      port,
      error: testDb.ok ? null : testDb.error
    });
  } catch (err: unknown) {
    const errorObject = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({
      databaseProvider: 'Supabase PostgreSQL',
      connectionStatus: 'failed',
      connectionSuccessful: false,
      serverEnvironment: process.env.NODE_ENV || 'production',
      latency: 'unknown',
      error: errorObject.message || String(err)
    }, { status: 500 });
  }
}
