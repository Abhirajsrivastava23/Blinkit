import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '../../../../data/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fatafat_session_token')?.value || '';

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('fatafat_session_token');
    return response;
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
