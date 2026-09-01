import { NextResponse } from 'next/server';
import { db } from '../../../../data/db';
import { getSession } from '../../../../data/auth';

export async function GET(request: Request) {
  try {
    // 1. Verify authorization (Admin or Delivery Partner can view)
    const session = await getSession(request);
    if (!session || (session.role !== 'admin' && session.role !== 'delivery_partner')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Delivery Partner authorization required.' },
        { status: 403 }
      );
    }

    // 2. Extract product ID from query params
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required.' },
        { status: 400 }
      );
    }

    // 3. Fetch image history from database
    try {
      const result = await db.query(
        'SELECT * FROM product_image_history WHERE "productId" = $1 ORDER BY "uploadedAt" DESC',
        [productId]
      );

      const history = result.rows || [];

      return NextResponse.json({
        success: true,
        productId,
        history,
        count: history.length
      });
    } catch (err) {
      console.error('Database query error:', err);
      return NextResponse.json(
        { error: 'Failed to retrieve image history from database.' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Error handling image history request:', err);
    return NextResponse.json(
      { error: 'Server error processing image history request.' },
      { status: 500 }
    );
  }
}
