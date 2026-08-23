import { NextResponse } from 'next/server';
import { db } from '../../../data/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const testDb = await db.testConnection();
    return NextResponse.json({
      mongodbConfigured: !!(process.env.MONGODB_URI || process.env.DATABASE_URL),
      databaseName: process.env.MONGODB_DB || 'fatafat',
      connectionSuccessful: testDb.ok,
      serverEnvironment: process.env.NODE_ENV || 'production',
      failureStage: testDb.ok ? null : (process.env.MONGODB_URI ? 'connect' : 'configuration'),
      error: testDb.ok ? null : testDb.error
    });
  } catch (err: any) {
    return NextResponse.json({
      mongodbConfigured: !!(process.env.MONGODB_URI || process.env.DATABASE_URL),
      databaseName: process.env.MONGODB_DB || 'fatafat',
      connectionSuccessful: false,
      serverEnvironment: process.env.NODE_ENV || 'production',
      failureStage: 'execution',
      error: err.message || String(err)
    }, { status: 500 });
  }
}
