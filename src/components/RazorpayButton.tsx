'use client';

import React, { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayButtonProps {
  amount?: number; // in INR (e.g. 500) or Paise if specified
  amountInPaise?: number; // explicit paise (e.g. 50000)
  orderId?: string; // DB order id or custom receipt
  name?: string;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  onSuccess?: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

function loadRazorpayScript(retries = 3): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    let attempt = 0;
    const tryLoad = () => {
      attempt++;
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existing = document.getElementById('razorpay-checkout-script') as HTMLScriptElement | null;
      if (existing) {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
        existing.addEventListener('error', () => {
          if (attempt < retries) {
            existing.remove();
            setTimeout(tryLoad, 600);
          } else {
            resolve(false);
          }
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(Boolean(window.Razorpay));
      script.onerror = () => {
        script.remove();
        if (attempt < retries) {
          setTimeout(tryLoad, 600);
        } else {
          resolve(false);
        }
      };
      document.head.appendChild(script);
    };

    tryLoad();
  });
}

export default function RazorpayButton({
  amount = 100,
  amountInPaise,
  orderId,
  name = 'FATAFAT',
  description = 'Online Purchase',
  customer,
  buttonText,
  className,
  onSuccess,
  onFailure,
  onDismiss,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const calculatedPaise = amountInPaise || Math.round(amount * 100);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Ensure Razorpay Checkout SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Call backend canonical create-order endpoint
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || (!data.orderId && !data.order_id)) {
        throw new Error(data.error || 'Failed to create payment order on the server.');
      }

      const keyId = data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const targetRzpOrderId = data.orderId || data.order_id;

      // 3. Open Razorpay Standard Checkout Modal
      const options = {
        key: keyId,
        amount: data.amount || calculatedPaise,
        currency: data.currency || 'INR',
        name,
        description,
        order_id: targetRzpOrderId,
        prefill: {
          name: customer?.name || data.customer?.name || '',
          email: customer?.email || data.customer?.email || '',
          contact: customer?.contact || data.customer?.contact || '',
        },
        theme: {
          color: '#701A28', // Brand Burgundy
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            // 4. Call backend canonical verify endpoint
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            if (onSuccess) {
              onSuccess(response);
            }
          } catch (err: any) {
            console.error('Signature verification error:', err);
            setErrorMsg(err.message || 'Signature verification failed.');
            if (onFailure) onFailure(err);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            if (onDismiss) onDismiss();
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (resp: any) {
        setLoading(false);
        const reason = resp.error?.description || 'Payment failed';
        setErrorMsg(reason);
        if (onFailure) onFailure(resp.error);
      });

      razorpayInstance.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg(err.message || 'Unable to open checkout modal.');
      if (onFailure) onFailure(err);
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className={
          className ||
          'px-6 py-3 bg-[#701A28] hover:bg-[#5A1420] text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60 cursor-pointer'
        }
      >
        {loading ? 'Opening Razorpay...' : buttonText || `Pay ₹${amount}`}
      </button>
      {errorMsg && (
        <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>
      )}
    </div>
  );
}
