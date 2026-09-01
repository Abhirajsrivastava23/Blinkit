import { NextResponse } from 'next/server';
import { db } from '../../../../../data/db';
import { getSession } from '../../../../../data/auth';

export async function GET(request: Request, context: any) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== 'admin' && session.role !== 'delivery_partner')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Delivery Partner session required.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const res = await db.query(
      'SELECT * FROM product_image_history WHERE "productId" = $1 ORDER BY "uploadedAt" DESC',
      [id]
    );

    return NextResponse.json({
      success: true,
      productId: id,
      history: res.rows || []
    });
  } catch (err) {
    console.error('Error fetching product image history:', err);
    return NextResponse.json(
      { error: 'Failed to fetch product image history.' },
      { status: 500 }
    );
  }
}
