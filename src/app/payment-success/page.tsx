'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Home, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useToast } from '../../components/Toast';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId || !orderId) {
      showToast('Missing payment information', 'error');
      router.push('/');
      return;
    }
    setLoading(false);
  }, [paymentId, orderId, router, showToast]);

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

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-2xl px-4">
          <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 text-center">
            
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-pulse" />
                <CheckCircle size={96} className="text-emerald-600 relative z-10" />
              </div>
            </div>

            {/* Success message */}
            <h1 className="font-serif text-3xl font-extrabold text-zinc-900 mb-2">
              Payment Successful! 🎉
            </h1>
            <p className="text-lg text-zinc-600 mb-8">
              Your order has been confirmed and is being prepared.
            </p>

            {/* Order details */}
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
                  <span className="text-zinc-600">Status:</span>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs">
                    CONFIRMED
                  </span>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-bold text-blue-900 mb-3">What Happens Next?</h3>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>Our team is preparing your order</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>A delivery partner will be assigned</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>You'll receive delivery updates via SMS & app</span>
                </li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push(`/order/${orderId}`)}
                className="flex-1 bg-brand-burgundy text-white font-bold py-3 px-6 rounded-2xl hover:bg-brand-burgundy/90 transition flex items-center justify-center gap-2"
              >
                Track Order <ArrowRight size={20} />
              </button>
              <button
                onClick={() => router.push('/account/orders')}
                className="flex-1 border-2 border-zinc-200 text-zinc-900 font-bold py-3 px-6 rounded-2xl hover:border-zinc-300 transition flex items-center justify-center gap-2"
              >
                <Home size={20} /> View Orders
              </button>
            </div>

            {/* Back to home */}
            <button
              onClick={() => router.push('/')}
              className="mt-6 text-brand-burgundy font-bold hover:underline"
            >
              Continue Shopping →
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12">
        <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-xs">Loading payment details...</div>}>
          <PaymentSuccessContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
