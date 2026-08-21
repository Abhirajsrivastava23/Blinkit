'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KeyboardShortcutListener() {
  const router = useRouter();

  useEffect(() => {
    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.key);

      const hasMeta = e.metaKey || pressedKeys.has('Meta');
      const hasTab = pressedKeys.has('Tab');
      const hasCapsLock = pressedKeys.has('CapsLock');
      const hasE = pressedKeys.has('e') || pressedKeys.has('E') || e.key.toLowerCase() === 'e';

      // 1. Windows + Tab + E (Admin Login)
      if (hasMeta && hasTab && hasE) {
        e.preventDefault();
        router.push('/admin/login');
      } 
      // 2. Windows + Caps Lock + E (Delivery Partner Login)
      else if (hasMeta && hasCapsLock && hasE) {
        e.preventDefault();
        router.push('/delivery-partner/login');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
    };

    const handleBlur = () => {
      pressedKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, [router]);

  return null;
}
