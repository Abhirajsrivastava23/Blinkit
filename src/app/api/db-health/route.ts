import { NextResponse } from 'next/server';
import { db } from '../../../data/db';
import { validateRole } from '../../../data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerSeed = searchParams.get('seed') === 'true';

    if (triggerSeed) {
      const adminSession = await validateRole(request, ['admin', 'super_admin']);
      if (!adminSession) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin authorization required to trigger database seeding.' },
          { status: 403 }
        );
      }

      console.log('Explicit database seed trigger received via API from Admin:', adminSession.email);
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

    let productCount = 0;
    try {
      const countRes = await db.query('SELECT count(*) as count FROM products');
      productCount = Number(countRes.rows[0]?.count || 0);
    } catch {
      // count failure
    }
    
    return NextResponse.json({
      databaseProvider: 'Supabase PostgreSQL',
      connectionStatus: testDb.ok ? 'connected' : 'failed',
      connectionSuccessful: testDb.ok,
      latency: `${latency}ms`,
      productCount
    });
  } catch (err: unknown) {
    return NextResponse.json({
      databaseProvider: 'Supabase PostgreSQL',
      connectionStatus: 'failed',
      connectionSuccessful: false,
      latency: 'unknown'
    }, { status: 500 });
  }
}

