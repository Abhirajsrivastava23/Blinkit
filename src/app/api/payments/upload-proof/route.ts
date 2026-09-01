import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getSession } from '@/data/auth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'customer') {
      return NextResponse.json({ error: 'Customer session required.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Payment proof image is required.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Upload JPG, PNG, or WebP only.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Payment proof is too large. Maximum allowed size is 5MB.' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-');
    const uniqueName = `${Date.now()}-${safeName}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/payments/${uniqueName}`;
    return NextResponse.json({ success: true, url: publicUrl, fileType: file.type, fileSize: file.size });
  } catch (error) {
    console.error('Payment proof upload error:', error);
    return NextResponse.json({ error: 'Failed to upload payment proof.' }, { status: 500 });
  }
}
