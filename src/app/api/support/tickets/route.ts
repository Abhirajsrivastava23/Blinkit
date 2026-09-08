import { NextResponse } from 'next/server';
import { db, SupportTicketRecord } from '@/data/db';
import { getSession } from '@/data/auth';
import { sendSupportTicketCreatedEmail } from '@/services/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const { searchParams } = new URL(request.url);
    const queryCustomerId = searchParams.get('customerId') || searchParams.get('email') || searchParams.get('phone') || '';

    // Authorization: User must be authenticated, or match provided query identifier
    let targetIdentifier = '';
    if (session && session.userId) {
      targetIdentifier = session.userId;
    } else if (session && session.email) {
      targetIdentifier = session.email;
    } else if (queryCustomerId) {
      targetIdentifier = queryCustomerId;
    }

    if (!targetIdentifier) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    const tickets = await db.getSupportTicketsByCustomer(targetIdentifier);

    return NextResponse.json({
      success: true,
      tickets
    });
  } catch (err) {
    console.error('Error fetching customer support tickets:', err);
    return NextResponse.json({ error: 'Failed to retrieve support tickets.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));

    let sessionName = '';
    let sessionPhone = '';
    if (session && session.userId) {
      const userRec = await db.getUserById(session.userId).catch(() => null);
      if (userRec) {
        sessionName = userRec['name'] ? String(userRec['name']) : '';
        sessionPhone = userRec['phone'] ? String(userRec['phone']) : '';
      }
    }

    const name = String(body.name || sessionName || '').trim();
    const email = String(body.email || session?.email || '').trim().toLowerCase();
    const phone = String(body.phone || body.mobile || sessionPhone || '').trim();
    const category = String(body.category || 'General Inquiry').trim();
    const message = String(body.message || '').trim();
    const orderId = body.orderId ? String(body.orderId).trim().replace(/^#+/, '') : undefined;
    const attachmentUrl = body.attachmentUrl ? String(body.attachmentUrl).trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: 'Please provide your full name.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Please provide a contact phone number.' }, { status: 400 });
    }
    if (!message || message.length < 5) {
      return NextResponse.json({ error: 'Please provide detailed message content (at least 5 characters).' }, { status: 400 });
    }

    // Determine customer ID for tracking
    let customerId = session?.userId || body.customerId;
    if (!customerId) {
      customerId = email ? `CUST-${email.split('@')[0]}` : `CUST-${phone.replace(/[^0-9]/g, '')}`;
    }

    const payload: Partial<SupportTicketRecord> = {
      customerId,
      name,
      email,
      phone,
      orderId,
      category,
      message,
      attachmentUrl,
      status: 'New'
    };

    const createdTicket = await db.createSupportTicket(payload);

    // Trigger Non-blocking Email Notifications to Customer & Admin
    void sendSupportTicketCreatedEmail(createdTicket);

    return NextResponse.json({
      success: true,
      ticketNumber: createdTicket.ticketNumber,
      ticket: createdTicket,
      message: `Your support request has been submitted. Ticket: ${createdTicket.ticketNumber}`
    });
  } catch (err) {
    console.error('Error creating support ticket:', err);
    return NextResponse.json({ error: 'Failed to submit support ticket. Please try again.' }, { status: 500 });
  }
}
