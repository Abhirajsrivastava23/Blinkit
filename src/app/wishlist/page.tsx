'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WishlistRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/account/wishlist');
  }, [router]);

  return (
    <div className="text-xs text-zinc-400 font-medium">
      Redirecting to wishlist portal...
    </div>
  );
}
