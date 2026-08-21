'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/account/profile');
  }, [router]);

  return (
    <div className="text-xs text-zinc-400 font-medium">
      Redirecting to profile details...
    </div>
  );
}
