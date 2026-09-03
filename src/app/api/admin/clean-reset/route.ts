import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole, verifyPassword } from '../../../../data/auth';
import adminJson from '../../../../data/db/admin.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * GET /api/admin/clean-reset
 * Fetch live system entity counts for Data Management Module
 */
export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required.' }, { status: 403, headers: noStoreHeaders });
    }

    const counts = await db.getEntityCounts();
    return NextResponse.json({
      success: true,
      counts,
      timestamp: new Date().toISOString()
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error fetching data management entity counts:', err);
    return NextResponse.json({ error: 'Server error retrieving entity counts.' }, { status: 500, headers: noStoreHeaders });
  }
}

/**
 * POST /api/admin/clean-reset
 * Execute secure granular database reset actions with re-authentication
 */
export async function POST(request: Request) {
  try {
    // 1. Strict Server-Side Super Admin Authorization
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required.' }, { status: 403, headers: noStoreHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const { action, confirmationText, password } = body;

    if (!action) {
      return NextResponse.json({ error: 'Reset action type is required.' }, { status: 400, headers: noStoreHeaders });
    }

    // 2. Normalize and Validate Action Type
    const rawAction = String(action).toUpperCase().replace(/^DELETE_/, '');
    const validActions = [
      'CUSTOMERS',
      'ORDERS',
      'PAYMENTS',
      'DELIVERY_PARTNERS',
      'SESSIONS_TEST_DATA',
      'CLEAR_TRANSACTIONAL',
      'FULL_RESET'
    ];

    const matchedAction = validActions.find(a => a === rawAction || a === String(action).toUpperCase());
    if (!matchedAction) {
      return NextResponse.json({ 
        error: `Invalid action "${action}". Allowed actions: ${validActions.join(', ')}` 
      }, { status: 400, headers: noStoreHeaders });
    }

    // 3. Confirmation Text Validation for Critical Actions
    const trimmedConfirm = String(confirmationText || '').trim().toUpperCase();
    if (matchedAction === 'CLEAR_TRANSACTIONAL' || matchedAction === 'FULL_RESET' || matchedAction === 'CUSTOMERS' || matchedAction === 'ORDERS') {
      if (trimmedConfirm !== 'DELETE' && trimmedConfirm !== 'RESET') {
        return NextResponse.json({ 
          error: 'Please type "DELETE" to confirm this destructive operation.' 
        }, { status: 400, headers: noStoreHeaders });
      }
    }

    // 4. Admin Password Re-Authentication
    if (!password || !String(password).trim()) {
      return NextResponse.json({ 
        error: 'Super Admin password is required to authorize this destructive operation.' 
      }, { status: 401, headers: noStoreHeaders });
    }

    const cleanAdminEmail = String(adminSession.email || '').toLowerCase().trim();
    const admins = await db.readTable<any>('admin') || [];
    let adminObj = admins.find(a => a.email && a.email.toLowerCase().trim() === cleanAdminEmail);
    if (!adminObj) {
      adminObj = (adminJson as any[]).find((a: any) => a.email && a.email.toLowerCase().trim() === cleanAdminEmail);
    }
    if (!adminObj) {
      adminObj = admins[0] || (adminJson as any[])[0];
    }

    const isPasswordValid = adminObj ? verifyPassword(password, adminObj.passwordHash) : false;
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Authentication failed: Invalid Super Admin password.' 
      }, { status: 401, headers: noStoreHeaders });
    }

    // 5. Execute Atomic Server-Side Database Reset
    const result = await db.executeDatabaseReset(
      matchedAction as any,
      adminSession.email || 'superadmin@fatafat.com'
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to execute database reset operation.' 
      }, { status: 500, headers: noStoreHeaders });
    }

    // 6. Fetch Updated Live Counts
    const updatedCounts = await db.getEntityCounts();

    const actionDescriptions: Record<string, string> = {
      CUSTOMERS: 'All customer accounts have been deleted.',
      ORDERS: 'All customer order records have been deleted.',
      PAYMENTS: 'All payment transactions and proof records have been cleared.',
      DELIVERY_PARTNERS: 'All delivery partner accounts have been removed.',
      SESSIONS_TEST_DATA: 'All inactive test sessions and temporary data have been cleared.',
      CLEAR_TRANSACTIONAL: 'All transactional data (orders, payments, test data) cleared successfully.',
      FULL_RESET: 'Full system reset completed cleanly. All core catalog, settings and Super Admin account preserved.'
    };

    return NextResponse.json({
      success: true,
      action: matchedAction,
      message: actionDescriptions[matchedAction] || 'Database reset operation completed successfully.',
      affected: result.affected,
      preserved: result.preserved,
      updatedCounts,
      timestamp: new Date().toISOString()
    }, { headers: noStoreHeaders });
  } catch (err) {
    console.error('Error during secure database reset action:', err);
    return NextResponse.json({ error: 'Internal server error during database cleanup.' }, { status: 500, headers: noStoreHeaders });
  }
}

