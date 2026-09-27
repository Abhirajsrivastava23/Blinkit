'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KeyboardShortcutListener() {
  const router = useRouter();

  useEffect(() => {
    const pressedKeys = new Set<string>();

    const isInputElement = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toUpperCase();
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable ||
        el.getAttribute('role') === 'textbox'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when user is interacting with text inputs/editable elements
      if (isInputElement(e.target) || isInputElement(document.activeElement)) {
        return;
      }

      pressedKeys.add(e.key);
      if (e.code) pressedKeys.add(e.code);

      const hasMeta = e.metaKey || pressedKeys.has('Meta') || pressedKeys.has('OS') || pressedKeys.has('Win');
      const hasShift = e.shiftKey || pressedKeys.has('Shift');
      const isKeyK = e.key?.toLowerCase() === 'k' || e.code === 'KeyK' || pressedKeys.has('k') || pressedKeys.has('K');
      const isKeyL = e.key?.toLowerCase() === 'l' || e.code === 'KeyL' || pressedKeys.has('l') || pressedKeys.has('L');

      // 1. Windows + Shift + K (Admin Login)
      if (hasMeta && hasShift && isKeyK) {
        e.preventDefault();
        pressedKeys.clear();
        router.push('/admin/login');
      }
      // 2. Windows + Shift + L (Delivery Partner Login)
      else if (hasMeta && hasShift && isKeyL) {
        e.preventDefault();
        pressedKeys.clear();
        router.push('/delivery-partner/login');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
      if (e.code) pressedKeys.delete(e.code);
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
