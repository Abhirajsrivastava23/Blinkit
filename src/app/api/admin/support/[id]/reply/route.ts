import { NextResponse } from 'next/server';
import { db, SupportTicketRecord } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Operations Console admin privileges required.' }, { status: 403 });
    }

    const { id } = await props.params;
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      return NextResponse.json({ error: 'Missing ticket ID.' }, { status: 400 });
    }

    const existingTicket = await db.getSupportTicketById(cleanId);
    if (!existingTicket) {
      return NextResponse.json({ error: `Support ticket with identifier '${cleanId}' not found.` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const adminReply = body.adminReply !== undefined ? String(body.adminReply).trim() : undefined;
    const status = body.status ? String(body.status).trim() : undefined;

    const updates: Partial<SupportTicketRecord> = {};
    const now = new Date().toISOString();

    if (adminReply !== undefined) {
      updates.adminReply = adminReply;
      updates.adminReplyAt = now;
      updates.adminRepliedBy = adminSession.email || 'Admin Support';
    }

    if (status) {
      const validStatuses = ['New', 'Open', 'In Progress', 'Resolved', 'Closed'];
      const matched = validStatuses.find(s => s.toLowerCase() === status.toLowerCase());
      if (matched) {
        updates.status = matched as 'New' | 'Open' | 'In Progress' | 'Resolved' | 'Closed';
      }
    }

    // Default status advancement if reply is added but status unchanged
    if (adminReply && (!status || status === 'New')) {
      updates.status = 'In Progress';
    }

    const updated = await db.updateSupportTicket(existingTicket.id, updates);

    // Audit log activity
    await db.logActivity(
      adminSession.email || 'admin@fatafat.com',
      'SUPPORT_TICKET_UPDATE',
      `Ticket: ${existingTicket.ticketNumber}`,
      `Status: ${existingTicket.status}`,
      `Status: ${updates.status || existingTicket.status}${adminReply ? ' (Replied)' : ''}`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: `Ticket ${existingTicket.ticketNumber} successfully updated.`
    });
  } catch (err) {
    console.error('Error replying to support ticket:', err);
    return NextResponse.json({ error: 'Failed to update support ticket.' }, { status: 500 });
  }
}
