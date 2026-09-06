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

    let sampleProducts: any[] = [];
    let productCount = 0;
    try {
      const pRes = await db.query('SELECT id, name, image, "updatedAt" FROM products LIMIT 5');
      sampleProducts = pRes.rows;
      const countRes = await db.query('SELECT count(*) as count FROM products');
      productCount = Number(countRes.rows[0]?.count || 0);
    } catch (e: any) {
      sampleProducts = [{ error: e.message }];
    }
    
    return NextResponse.json({
      databaseProvider: 'Supabase PostgreSQL',
      connectionStatus: testDb.ok ? 'connected' : 'failed',
      connectionSuccessful: testDb.ok,
      serverEnvironment: process.env.NODE_ENV || 'production',
      latency: `${latency}ms`,
      productCount,
      sampleProducts,
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
