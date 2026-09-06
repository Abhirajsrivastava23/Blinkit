import { NextResponse } from 'next/server';
import { db } from '@/data/db';
import { validateRole } from '@/data/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const adminSession = await validateRole(request, ['admin', 'super_admin']);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'All';
    const requestTypeFilter = searchParams.get('requestType') || 'All';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    let requests = await db.getAllCustomRequests({
      status: statusFilter,
      requestType: requestTypeFilter
    });

    if (searchQuery) {
      requests = requests.filter(r => {
        const idMatch = r.id.toLowerCase().includes(searchQuery);
        const nameMatch = r.customerName.toLowerCase().includes(searchQuery);
        const emailMatch = r.email.toLowerCase().includes(searchQuery);
        const mobileMatch = r.mobile.toLowerCase().includes(searchQuery);
        const prodMatch = (r.productName || '').toLowerCase().includes(searchQuery);
        const detailsMatch = (r.requestedDetails || '').toLowerCase().includes(searchQuery);
        const msgMatch = (r.personalisationMessage || '').toLowerCase().includes(searchQuery);
        const orderIdMatch = (r.customOrderId || '').toLowerCase().includes(searchQuery);
        return idMatch || nameMatch || emailMatch || mobileMatch || prodMatch || detailsMatch || msgMatch || orderIdMatch;
      });
    }

    return NextResponse.json({
      success: true,
      customRequests: requests,
      totalCount: requests.length
    });
  } catch (err) {
    console.error('Error fetching admin custom requests:', err);
    return NextResponse.json({ error: 'Failed to retrieve custom requests for admin.' }, { status: 500 });
  }
}
