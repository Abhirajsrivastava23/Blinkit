import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { validateRole } from '../../../../data/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required.' }, { status: 403 });
    }

    let ordersRemoved = 0;
    let paymentsRemoved = 0;
    let usersRemoved = 0;
    let issuesRemoved = 0;
    let sessionsRemoved = 0;

    // 1. Reset PostgreSQL database tables if connected
    const connTest = await db.testConnection();
    if (connTest.ok) {
      try {
        const orderCount = await db.query('SELECT COUNT(*) FROM orders');
        ordersRemoved = parseInt((orderCount.rows[0] as any)?.count || '0', 10);
        await db.query('DELETE FROM orders');

        const payCount = await db.query('SELECT COUNT(*) FROM payment_transactions');
        paymentsRemoved = parseInt((payCount.rows[0] as any)?.count || '0', 10);
        await db.query('DELETE FROM payment_transactions');

        const userCount = await db.query('SELECT COUNT(*) FROM users');
        usersRemoved = parseInt((userCount.rows[0] as any)?.count || '0', 10);
        await db.query('DELETE FROM users');

        const issueCount = await db.query('SELECT COUNT(*) FROM "inventoryIssues"');
        issuesRemoved = parseInt((issueCount.rows[0] as any)?.count || '0', 10);
        await db.query('DELETE FROM "inventoryIssues"');

        const sessCount = await db.query("SELECT COUNT(*) FROM sessions WHERE role NOT IN ('admin', 'delivery_partner')");
        sessionsRemoved = parseInt((sessCount.rows[0] as any)?.count || '0', 10);
        await db.query("DELETE FROM sessions WHERE role NOT IN ('admin', 'delivery_partner')");

        await db.query('DELETE FROM delivery_photos').catch(() => {});
        await db.query('DELETE FROM wellness_access_requests').catch(() => {});
        await db.query('DELETE FROM wellness_terms_acceptances').catch(() => {});
      } catch (dbErr) {
        console.warn('PostgreSQL reset warning:', dbErr);
      }
    }

    // 2. Reset In-Memory Tables
    await db.writeTable('orders', []);
    await db.writeTable('payment_transactions', []);
    await db.writeTable('users', []);
    await db.writeTable('inventoryIssues', []);

    // Clean sessions keeping only active admin/delivery_partner
    const existingSessions = await db.readTable<any>('sessions') || [];
    const staffSessions = existingSessions.filter((s: any) => s.role === 'admin' || s.role === 'delivery_partner');
    await db.writeTable('sessions', staffSessions);

    // Count preserved records
    const partners = await db.readTable<any>('partners') || [];
    const products = await db.readTable<any>('products') || [];
    const categories = await db.readTable<any>('categories') || [];

    db.logActivity(
      adminSession.email || 'Admin',
      'CLEAN_DATABASE_RESET',
      'Transaction Data Cleared',
      `Orders: ${ordersRemoved}, Payments: ${paymentsRemoved}, Users: ${usersRemoved}`,
      'System reset completed cleanly'
    );

    return NextResponse.json({
      success: true,
      message: 'Transactional and test data cleaned successfully.',
      removed: {
        orders: ordersRemoved,
        payments: paymentsRemoved,
        users: usersRemoved,
        issues: issuesRemoved,
        sessions: sessionsRemoved
      },
      preserved: {
        adminAccounts: 1,
        deliveryPartners: partners.length,
        products: products.length,
        categories: categories.length,
        systemSettings: true,
        paymentConfig: true
      }
    });
  } catch (err) {
    console.error('Error during clean database reset:', err);
    return NextResponse.json({ error: 'Server error during database cleanup.' }, { status: 500 });
  }
}
