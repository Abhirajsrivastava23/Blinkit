/**
 * Client-Side Image Compression Utility
 * Resizes and compresses image files in the browser before upload to ensure:
 * - Instant upload over any connection
 * - Compliance with Vercel serverless request/response payload limits (<4.5MB)
 * - Optimal visual quality without huge base64 strings or DB bloat
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    mimeType = 'image/jpeg'
  } = options;

  // If not running in a browser or file is SVG, return as is
  if (typeof window === 'undefined' || !window.document || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    // If file is already very small (< 150 KB), return original
    if (file.size <= 150 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        // Fill background white for JPEG format transparency handling
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Construct new compressed file
            const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFileName = `${baseName}-opt${ext}`;

            const compressedFile = new File([blob], compressedFileName, {
              type: mimeType,
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}
