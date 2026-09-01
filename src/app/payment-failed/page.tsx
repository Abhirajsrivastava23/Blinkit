'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Home, RotateCcw, Trash2 } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useToast } from '../../components/Toast';

function PaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');
  const reason = searchParams.get('reason') || 'Payment processing failed';

  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!paymentId || !orderId) {
      showToast('Missing payment information', 'error');
      router.push('/');
      return;
    }
    setLoading(false);
  }, [paymentId, orderId, router, showToast]);

  const handleRetry = () => {
    if (retryCount >= 2) {
      showToast('Maximum retry attempts reached. Please contact support.', 'error');
      return;
    }
    setRetryCount(retryCount + 1);
    router.push(`/checkout?orderId=${orderId}&retry=true`);
  };

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/orders/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        showToast('Order cancelled successfully', 'success');
        router.push('/');
      } else {
        showToast('Failed to cancel order', 'error');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      showToast('Error cancelling order', 'error');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] py-12">
          <div className="mx-auto max-w-md px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-zinc-200 rounded-2xl" />
              <div className="h-6 bg-zinc-200 rounded" />
              <div className="h-6 bg-zinc-200 rounded w-2/3" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const canRetry = retryCount < 2;

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-2xl px-4">
          <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 text-center">
            
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
                <AlertCircle size={96} className="text-red-600 relative z-10" />
              </div>
            </div>

            <h1 className="font-serif text-3xl font-extrabold text-zinc-900 mb-2">
              Payment Failed
            </h1>
            <p className="text-lg text-zinc-600 mb-8">
              {reason}
            </p>

            <div className="bg-zinc-50 rounded-2xl p-6 mb-8 text-left">
              <h2 className="font-bold text-zinc-900 mb-4">Order Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Order ID:</span>
                  <span className="font-mono font-bold text-zinc-900">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Payment ID:</span>
                  <span className="font-mono font-bold text-zinc-900">{paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Retry Attempts:</span>
                  <span className="font-bold text-zinc-900">{retryCount}/2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Status:</span>
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold text-xs">
                    PAYMENT FAILED
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-bold text-amber-900 mb-2">What went wrong?</h3>
              <p className="text-sm text-amber-900 mb-4">
                {reason || 'Your payment could not be processed. This could be due to:'}
              </p>
              <ul className="space-y-2 text-sm text-amber-900">
                <li className="flex gap-2"><span>•</span><span>Insufficient funds in your account</span></li>
                <li className="flex gap-2"><span>•</span><span>Card expired or blocked by your bank</span></li>
                <li className="flex gap-2"><span>•</span><span>Network connectivity issue</span></li>
                <li className="flex gap-2"><span>•</span><span>Your bank declined the transaction</span></li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {canRetry ? (
                <button onClick={handleRetry} className="flex-1 bg-brand-burgundy text-white font-bold py-3 px-6 rounded-2xl hover:bg-brand-burgundy/90 transition flex items-center justify-center gap-2">
                  <RotateCcw size={20} /> Try Again
                </button>
              ) : (
                <button disabled className="flex-1 bg-zinc-300 text-zinc-500 font-bold py-3 px-6 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2">
                  <RotateCcw size={20} /> Maximum Retries Reached
                </button>
              )}
              <button onClick={handleCancel} className="flex-1 border-2 border-red-200 text-red-600 font-bold py-3 px-6 rounded-2xl hover:bg-red-50 transition flex items-center justify-center gap-2">
                <Trash2 size={20} /> Cancel Order
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-200 text-center text-sm text-zinc-600">
              <p className="mb-2">Need help?</p>
              <a href="/contact" className="text-brand-burgundy font-bold hover:underline">Contact Support</a>
              {' '} or call <a href="tel:+919999999990" className="text-brand-burgundy font-bold hover:underline">+91 9999999990</a>
            </div>

            <button onClick={() => router.push('/')} className="mt-6 text-brand-burgundy font-bold hover:underline flex items-center justify-center gap-2 mx-auto">
              <Home size={18} /> Return Home
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentFailedPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12">
        <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-xs">Loading payment details...</div>}>
          <PaymentFailedContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
