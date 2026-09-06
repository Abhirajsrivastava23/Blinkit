import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const mimeType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);
    const hasValidExtension = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp') || fileName.endsWith('.pdf');

    if (!isAllowedMime && !hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file format. Supported formats: JPEG, PNG, WebP, PDF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the 10 MB maximum limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
        { status: 400 }
      );
    }

    let fileUrl = '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sanitizedFileName = (file.name || 'support_attachment.jpg').replace(/[^a-zA-Z0-9._-]/g, '');
    const storagePath = `support/${Date.now()}-${sanitizedFileName}`;

    if (supabaseUrl && supabaseKey) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/product-images/${storagePath}`;
        const arrayBuffer = await file.arrayBuffer();

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': mimeType || 'image/jpeg',
            'x-upsert': 'true'
          },
          body: arrayBuffer,
          signal: AbortSignal.timeout(4000)
        });

        if (uploadRes.ok) {
          fileUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`;
        }
      } catch (err) {
        console.warn('Supabase storage upload fallback to base64 for support attachment:', err);
      }
    }

    // Fallback to base64 Data URI if storage bucket is unavailable
    if (!fileUrl) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        fileUrl = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
      } catch {
        return NextResponse.json({ error: 'Failed to process file buffer.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType
    });
  } catch (err) {
    console.error('Error uploading support attachment:', err);
    return NextResponse.json({ error: 'Failed to upload attachment.' }, { status: 500 });
  }
}
