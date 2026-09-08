import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';
import {
  getActiveEmailProvider,
  getSenderEmail,
  getSenderEmailForEvent,
  getAdminAlertEmail,
  getAllConfiguredSenders,
  sendEmailSafely
} from '@/services/emailService';
import * as templates from '@/services/emailTemplates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/email-status
 * Returns email provider health, settings, metrics, and recent logs
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
          ADMIN_ALERT_EMAIL: !!process.env.ADMIN_ALERT_EMAIL,
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

/**
 * POST /api/admin/email-status
 * Sends a single test email OR executes the Super Admin-only send_all_22_synthetic batch test.
 * Uses 100% in-memory synthetic test payloads without modifying database business records.
 */
export async function POST(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const recipientEmail = String(body.recipientEmail || adminSession.email || 'krishnamdwivedi17@gmail.com').trim();
    const action = String(body.action || body.templateType || 'test').trim();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid recipient email address is required.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

    // Synthetic in-memory mock data (Isolated from database)
    const mockOrder = {
      id: 'FT-SYNTH-9921',
      customerEmail: recipientEmail,
      total: 1499,
      subtotal: 1499,
      deliveryFee: 0,
      discount: 0,
      status: 'CONFIRMED',
      paymentMethod: 'UPI / Razorpay',
      paymentStatus: 'PAID',
      deliveryOption: 'Express 30-Minute Delivery',
      deliveryTimeSlot: '11:30 PM - 12:00 AM',
      eta: '30 mins',
      assignedPartnerName: 'Rohan Verma (FATAFAT Express Rider #41)',
      address: {
        name: 'Krishnam Dwivedi',
        street: '12th Floor, Prestige Tech Park',
        city: 'Bengaluru, Karnataka',
        mobile: '+91 9876543210',
        phone: '+91 9876543210'
      },
      items: [
        { title: 'Velvet Midnight Rose Bouquet (12 Fresh Stems)', quantity: 1, price: 999 },
        { title: 'Artisanal Belgian Dark Truffles Box (200g)', quantity: 1, price: 500 }
      ]
    };

    const mockRefundReq = {
      id: 'REF-SYNTH-8812',
      orderId: 'FT-SYNTH-9921',
      amount: 1499,
      reason: 'Synthetic claim audit test verification',
      razorpayRefundId: 'rfnd_SYNTH_98372645',
      customerEmail: recipientEmail
    };

    const mockTicket = {
      id: 'TCK-SYNTH-4421',
      ticketNumber: 'TICK-4421',
      name: 'Krishnam Dwivedi',
      email: recipientEmail,
      phone: '+91 9876543210',
      category: 'DELIVERY & TIMING',
      orderId: 'FT-SYNTH-9921',
      status: 'Resolved',
      message: 'Could you confirm if the delivery partner has departed with the insulated temperature-controlled box?'
    };

    const mockCustomReq = {
      id: 'REQ-SYNTH-3310',
      customerName: 'Krishnam Dwivedi',
      email: recipientEmail,
      phone: '+91 9876543210',
      productName: 'Custom 3-Tier Pistachio Raspberry Birthday Gateau',
      quantity: 1,
      flavour: 'Pistachio Mousseline & Fresh Raspberry Coulis',
      personalisationMessage: 'Happy 25th Birthday Krishnam!',
      preferredDeliveryDate: '10th Sept 2026',
      preferredDeliveryTime: 'Evening 7:00 PM'
    };

    // =========================================================================
    // BATCH MODE: SEND ALL 22 SYNTHETIC TEMPLATES
    // =========================================================================
    if (action === 'send_all_22_synthetic' || body.templateType === 'send_all_22_synthetic') {
      const allTests = [
        // 15 Customer Transactional Emails
        {
          id: 1,
          name: 'Order Placed',
          categoryLabel: 'orders@fatafatapp.me',
          eventType: 'order_placed',
          render: () => templates.templateOrderPlaced(mockOrder)
        },
        {
          id: 2,
          name: 'Payment Verified',
          categoryLabel: 'orders@fatafatapp.me',
          eventType: 'payment_verified',
          render: () => templates.templatePaymentVerified(mockOrder, 'pay_SYNTH_razorpay_9981')
        },
        {
          id: 3,
          name: 'Order Confirmed',
          categoryLabel: 'notifications@fatafatapp.me',
          eventType: 'order_confirmed',
          render: () => templates.templateOrderConfirmed(mockOrder)
        },
        {
          id: 4,
          name: 'Order Preparing',
          categoryLabel: 'notifications@fatafatapp.me',
          eventType: 'order_preparing',
          render: () => templates.templateOrderPreparing(mockOrder)
        },
        {
          id: 5,
          name: 'Out for Delivery',
          categoryLabel: 'notifications@fatafatapp.me',
          eventType: 'order_out_for_delivery',
          render: () => templates.templateOutForDelivery(mockOrder)
        },
        {
          id: 6,
          name: 'Order Delivered',
          categoryLabel: 'notifications@fatafatapp.me',
          eventType: 'order_delivered',
          render: () => templates.templateOrderDelivered(mockOrder)
        },
        {
          id: 7,
          name: 'Order Cancelled',
          categoryLabel: 'notifications@fatafatapp.me',
          eventType: 'order_cancelled',
          render: () => templates.templateOrderCancelled(mockOrder, 'Customer requested synthetic test cancellation')
        },
        {
          id: 8,
          name: 'Refund Requested',
          categoryLabel: 'refunds@fatafatapp.me',
          eventType: 'refund_requested',
          render: () => templates.templateRefundRequested(mockRefundReq, mockOrder)
        },
        {
          id: 9,
          name: 'Refund Processed',
          categoryLabel: 'refunds@fatafatapp.me',
          eventType: 'refund_processed',
          render: () => templates.templateRefundProcessed(mockRefundReq, mockOrder)
        },
        {
          id: 10,
          name: 'Refund Rejected',
          categoryLabel: 'refunds@fatafatapp.me',
          eventType: 'refund_rejected',
          render: () => templates.templateRefundRejected(mockRefundReq, 'Claim submitted after allowable return inspection window')
        },
        {
          id: 11,
          name: 'Custom Request Received',
          categoryLabel: 'customercare@fatafatapp.me',
          eventType: 'custom_request_received',
          render: () => templates.templateCustomRequestReceived(mockCustomReq)
        },
        {
          id: 12,
          name: 'Custom Order Payment Link',
          categoryLabel: 'customercare@fatafatapp.me',
          eventType: 'custom_payment_link',
          render: () => templates.templateCustomOrderPaymentLink(mockCustomReq, `${appUrl}/checkout/custom/REQ-SYNTH-3310`, 3499)
        },
        {
          id: 13,
          name: 'Support Ticket Created',
          categoryLabel: 'support@fatafatapp.me',
          eventType: 'support_ticket_created',
          render: () => templates.templateSupportTicketCreated(mockTicket)
        },
        {
          id: 14,
          name: 'Support Ticket Reply',
          categoryLabel: 'support@fatafatapp.me',
          eventType: 'support_ticket_reply',
          render: () => templates.templateSupportTicketReply(mockTicket, 'Dear Krishnam, our concierge has verified that rider Rohan Verma has the temperature-controlled kit equipped and is on the way.')
        },
        {
          id: 15,
          name: 'Password Reset',
          categoryLabel: 'notifications@fatafatapp.me',
          eventType: 'password_reset',
          render: () => templates.templatePasswordReset(recipientEmail, `${appUrl}/auth/reset-password?token=synth_sec_token_99812`)
        },

        // 7 Admin Alert Emails
        {
          id: 16,
          name: '[ADMIN] New Order',
          categoryLabel: 'orders@fatafatapp.me',
          eventType: 'admin_new_order',
          render: () => templates.templateAdminNewOrder(mockOrder)
        },
        {
          id: 17,
          name: '[ADMIN] Payment Success',
          categoryLabel: 'orders@fatafatapp.me',
          eventType: 'admin_payment_success',
          render: () => templates.templateAdminPaymentSuccess(mockOrder, 'pay_SYNTH_razorpay_9981')
        },
        {
          id: 18,
          name: '[ADMIN] Payment Failed',
          categoryLabel: 'orders@fatafatapp.me',
          eventType: 'admin_payment_failed',
          render: () => templates.templateAdminPaymentFailed(mockOrder, 'Bank UPI network timeout / user dropped', 'pay_SYNTH_attempt_failed')
        },
        {
          id: 19,
          name: '[ADMIN] New Refund Request',
          categoryLabel: 'refunds@fatafatapp.me',
          eventType: 'admin_new_refund_request',
          render: () => templates.templateAdminNewRefundRequest(mockRefundReq, mockOrder)
        },
        {
          id: 20,
          name: '[ADMIN] Refund Status',
          categoryLabel: 'refunds@fatafatapp.me',
          eventType: 'admin_refund_status',
          render: () => templates.templateAdminRefundStatus(mockRefundReq, 'PROCESSED')
        },
        {
          id: 21,
          name: '[ADMIN] New Support Ticket',
          categoryLabel: 'support@fatafatapp.me',
          eventType: 'admin_new_support_ticket',
          render: () => templates.templateAdminNewSupportTicket(mockTicket)
        },
        {
          id: 22,
          name: '[ADMIN] New Custom Request',
          categoryLabel: 'customercare@fatafatapp.me',
          eventType: 'admin_new_custom_request',
          render: () => templates.templateAdminNewCustomRequest(mockCustomReq)
        }
      ];

      const results = [];
      let passedCount = 0;
      let failedCount = 0;

      for (const item of allTests) {
        const rendered = item.render();
        const effectiveSender = getSenderEmailForEvent(item.eventType);
        const batchTimestamp = Date.now();

        const sendResult = await sendEmailSafely({
          to: recipientEmail,
          subject: `[TEST] ${rendered.subject}`,
          html: rendered.html,
          from: effectiveSender,
          eventType: `SYNTHETIC_${item.eventType}`,
          referenceId: `SYNTH-${item.id}-${batchTimestamp}`,
          recipientRole: item.id >= 16 ? 'admin' : 'customer',
          recipientName: 'Krishnam Dwivedi',
          idempotencyKey: `synth:batch22:${item.id}:${batchTimestamp}:${recipientEmail}`,
          metadata: {
            isSyntheticTest: true,
            templateId: item.id,
            templateName: item.name,
            triggeredBy: adminSession.email
          }
        });

        if (sendResult.success) {
          passedCount++;
          results.push({
            id: item.id,
            name: item.name,
            category: item.categoryLabel,
            sender: effectiveSender,
            recipient: recipientEmail,
            messageId: sendResult.messageId || 'ACCEPTED',
            provider: sendResult.provider,
            status: 'PASS',
            error: null
          });
        } else {
          failedCount++;
          results.push({
            id: item.id,
            name: item.name,
            category: item.categoryLabel,
            sender: effectiveSender,
            recipient: recipientEmail,
            messageId: null,
            provider: sendResult.provider,
            status: 'FAIL',
            error: sendResult.error || 'Dispatch error'
          });
        }

        // Small delay to respect API rate limits
        await new Promise((r) => setTimeout(r, 250));
      }

      return NextResponse.json({
        success: failedCount === 0,
        mode: 'BATCH_22_SYNTHETIC',
        total: allTests.length,
        passedCount,
        failedCount,
        recipient: recipientEmail,
        results
      });
    }

    // =========================================================================
    // SINGLE TEMPLATE TEST MODE
    // =========================================================================
    let subject = `FATAFAT System Test Email [${new Date().toLocaleTimeString('en-IN')}]`;
    let html = '';
    let eventType = 'test_ping';

    switch (action) {
      case 'order_placed': {
        const res = templates.templateOrderPlaced(mockOrder);
        subject = res.subject;
        html = res.html;
        eventType = 'order_placed';
        break;
      }
      case 'out_for_delivery': {
        const res = templates.templateOutForDelivery(mockOrder);
        subject = res.subject;
        html = res.html;
        eventType = 'order_out_for_delivery';
        break;
      }
      case 'order_delivered': {
        const res = templates.templateOrderDelivered(mockOrder);
        subject = res.subject;
        html = res.html;
        eventType = 'order_delivered';
        break;
      }
      case 'refund_processed': {
        const res = templates.templateRefundProcessed(mockRefundReq, mockOrder);
        subject = res.subject;
        html = res.html;
        eventType = 'refund_processed';
        break;
      }
      default: {
        eventType = 'system_ping';
        html = templates.renderEmailLayout({
          title: 'Transactional Email Engine Online',
          preheader: 'Your FATAFAT transactional notification pipeline is operating with zero errors.',
          headerBadge: {
            text: 'System Diagnostic Test',
            bg: '#ECFDF5',
            color: '#059669',
            border: '#A7F3D0'
          },
          childrenHtml: `
            <div style="background-color: #FAF9F7; border: 1px solid #ECEAE5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1E293B; font-family: 'Playfair Display', Georgia, serif;">Diagnostic Details:</h3>
              <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; font-weight: 600;">Active Mode:</td><td style="padding: 4px 0;">${getActiveEmailProvider().details}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Configured Sender:</td><td style="padding: 4px 0;">${getSenderEmail()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Admin Recipient:</td><td style="padding: 4px 0;">${getAdminAlertEmail()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Triggered By:</td><td style="padding: 4px 0;">${adminSession.email}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Server Timestamp:</td><td style="padding: 4px 0;">${new Date().toISOString()}</td></tr>
              </table>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748B; line-height: 1.6;">
              All 15 customer transactional emails and 7 instant admin alerts are live, non-blocking, and protected with idempotency deduplication.
            </p>
          `,
          callToAction: {
            text: 'Open Operations Console',
            url: `${appUrl}/admin/settings`
          }
        });
        break;
      }
    }

    const sendResult = await sendEmailSafely({
      to: recipientEmail,
      subject,
      html,
      eventType: `SYNTHETIC_${eventType}`,
      referenceId: `TEST-${Date.now()}`,
      recipientRole: 'admin',
      recipientName: adminSession.email,
      idempotencyKey: `synth:single:${eventType}:${recipientEmail}:${Date.now()}`
    });

    return NextResponse.json({
      success: sendResult.success,
      result: sendResult,
      messageId: sendResult.messageId || 'ACCEPTED',
      message: sendResult.success
        ? `Test email dispatched successfully (${sendResult.status} via ${sendResult.provider}).`
        : `Test email dispatch failed: ${sendResult.error || 'Unknown error'}`
    });
  } catch (err) {
    console.error('Error sending test email:', err);
    return NextResponse.json(
      { error: 'Failed to dispatch test email.' },
      { status: 500 }
    );
  }
}
