import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Operations Console admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    const categoryFilter = searchParams.get('category') || '';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    // Fetch all tickets from PostgreSQL
    const allTickets = await db.getAllSupportTickets();

    // Calculate metrics for admin overview
    const stats = {
      total: allTickets.length,
      new: allTickets.filter(t => t.status === 'New').length,
      open: allTickets.filter(t => t.status === 'Open').length,
      inProgress: allTickets.filter(t => t.status === 'In Progress').length,
      resolved: allTickets.filter(t => t.status === 'Resolved').length,
      closed: allTickets.filter(t => t.status === 'Closed').length
    };

    // Filter by status if provided
    let filtered = allTickets;
    if (statusFilter && statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Filter by category if provided
    if (categoryFilter && categoryFilter !== 'All') {
      filtered = filtered.filter(t => t.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Search query partial matching across fields
    if (searchQuery) {
      filtered = filtered.filter(t => {
        const ticketNumMatch = (t.ticketNumber || '').toLowerCase().includes(searchQuery);
        const nameMatch = (t.name || '').toLowerCase().includes(searchQuery);
        const emailMatch = (t.email || '').toLowerCase().includes(searchQuery);
        const phoneMatch = (t.phone || '').toLowerCase().includes(searchQuery);
        const orderMatch = (t.orderId || '').toLowerCase().includes(searchQuery);
        const categoryMatch = (t.category || '').toLowerCase().includes(searchQuery);
        const messageMatch = (t.message || '').toLowerCase().includes(searchQuery);
        const replyMatch = (t.adminReply || '').toLowerCase().includes(searchQuery);

        return ticketNumMatch || nameMatch || emailMatch || phoneMatch || orderMatch || categoryMatch || messageMatch || replyMatch;
      });
    }

    // Optionally enrich with linked order info if orderId exists
    const allOrders = await db.getOrders().catch(() => []);
    const orderMap = new Map<string, any>();
    for (const ord of allOrders) {
      const cleanOid = String(ord.id || '').replace(/^#+/, '').trim().toLowerCase();
      orderMap.set(cleanOid, ord);
    }

    const enriched = filtered.map(ticket => {
      let linkedOrder = null;
      if (ticket.orderId) {
        const cleanOid = String(ticket.orderId).replace(/^#+/, '').trim().toLowerCase();
        linkedOrder = orderMap.get(cleanOid) || null;
      }
      return {
        ...ticket,
        order: linkedOrder
      };
    });

    return NextResponse.json({
      success: true,
      tickets: enriched,
      totalCount: enriched.length,
      stats
    });
  } catch (err) {
    console.error('Error fetching admin support tickets:', err);
    return NextResponse.json({ error: 'Failed to retrieve support tickets for admin dashboard.' }, { status: 500 });
  }
}
