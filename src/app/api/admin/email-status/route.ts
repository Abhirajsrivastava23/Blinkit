import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';
import {
  getActiveEmailProvider,
  getSenderEmail,
  getAdminAlertEmail,
  getAllConfiguredSenders
} from '@/services/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/email-status
 * Returns email provider health, settings, metrics, and recent PostgreSQL audit logs
 */
export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const offset = Math.max(0, Number(searchParams.get('offset') || 0));
    const statusFilter = searchParams.get('status') || undefined;

    const providerInfo = getActiveEmailProvider();
    const senderEmail = getSenderEmail();
    const adminAlertEmail = getAdminAlertEmail();
    const categorySenders = getAllConfiguredSenders();

    const [stats, logs] = await Promise.all([
      db.getEmailStats(),
      db.getEmailLogs({ limit, offset, status: statusFilter })
    ]);

    return NextResponse.json({
      success: true,
      config: {
        provider: providerInfo.provider,
        isConfigured: providerInfo.isConfigured,
        details: providerInfo.details,
        senderEmail,
        adminAlertEmail,
        categorySenders,
        environmentVariablesDetected: {
          RESEND_API_KEY: !!process.env.RESEND_API_KEY,
          BREVO_API_KEY: !!process.env.BREVO_API_KEY,
          SMTP_HOST: !!process.env.SMTP_HOST,
          EMAIL_FROM: !!process.env.EMAIL_FROM,
          EMAIL_FROM_ORDERS: !!process.env.EMAIL_FROM_ORDERS,
          EMAIL_FROM_NOTIFICATIONS: !!process.env.EMAIL_FROM_NOTIFICATIONS,
          EMAIL_FROM_SUPPORT: !!process.env.EMAIL_FROM_SUPPORT,
          EMAIL_FROM_CUSTOMERCARE: !!process.env.EMAIL_FROM_CUSTOMERCARE,
          EMAIL_FROM_REFUNDS: !!process.env.EMAIL_FROM_REFUNDS,
          ADMIN_ALERT_EMAIL: !!process.env.ADMIN_ALERT_EMAIL || !!process.env.ADMIN_ALERT_EMAILS,
          ADMIN_ALERT_EMAILS: !!process.env.ADMIN_ALERT_EMAILS,
          NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL
        }
      },
      stats,
      logs
    });
  } catch (err) {
    console.error('Error fetching admin email status:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve email system status.' },
      { status: 500 }
    );
  }
}
