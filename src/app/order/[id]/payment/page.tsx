'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  ShoppingBag, 
  Truck, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  UploadCloud, 
  Check, 
  AlertCircle,
  MapPin,
  FileText,
  Lock,
  ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import { useOrders, Order } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';

interface QrResponse {
  success: boolean;
  upiId: string;
  amount: number;
  uri: string;
  merchantName: string;
  orderId: string;
  note?: string;
  error?: string;
}

export default function OrderPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById } = useOrders();
  const { showToast } = useToast();
  
  const orderId = params.id as string;
  const contextOrder = getOrderById(orderId);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dynamic UPI QR details from backend
  const [qrDetails, setQrDetails] = useState<QrResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Payment proof form state
  const [utr, setUtr] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Fetch order details from API with cache: 'no-store'
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          setFetchedOrder(data);
          setFetchError(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (!contextOrder && !fetchedOrder) {
          setFetchError(errData.error || `HTTP ${res.status}: Order not accessible.`);
        }
      }
    } catch (err) {
      console.error('Error polling order details:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, contextOrder, fetchedOrder]);

  // Initial load + live polling every 3 seconds for instant status sync
  useEffect(() => {
    void fetchOrderDetails();
    const interval = setInterval(() => {
      void fetchOrderDetails();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchOrderDetails]);

  const order = fetchedOrder || contextOrder;

  // Fetch dynamic QR code data from backend API whenever order is loaded
  useEffect(() => {
    if (!order?.id || !order?.total) return;
    let isMounted = true;
    setQrLoading(true);

    fetch(`/api/payments/qr?orderId=${encodeURIComponent(order.id)}&amount=${encodeURIComponent(String(order.total))}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: QrResponse | null) => {
        if (isMounted && data && data.success) {
          setQrDetails(data);
        }
      })
      .catch((err) => console.error('Error loading QR code data:', err))
      .finally(() => {
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.total]);

  // Handle local file preview cleanup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, JPEG, WebP).', 'error');
        return;
      }
      setProofFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCopyUpi = async () => {
    const targetUpi = qrDetails?.upiId || '8081988627@pthdfc';
    try {
      await navigator.clipboard.writeText(targetUpi);
      showToast(`UPI ID copied: ${targetUpi}`, 'success');
    } catch {
      showToast(`UPI ID: ${targetUpi}`, 'info');
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const trimmedUtr = utr.trim();
    if (!trimmedUtr) {
      showToast('Please enter the UTR / transaction reference from your UPI payment.', 'error');
      return;
    }

    if (!proofFile) {
      showToast('Please attach a screenshot of your payment receipt.', 'error');
      return;
    }

    try {
      setIsSubmittingProof(true);

      // 1. Upload screenshot to backend storage
      const formData = new FormData();
      formData.append('file', proofFile);

      const uploadRes = await fetch('/api/payments/upload-proof', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json() as { success?: boolean; url?: string; error?: string };
      if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || 'Failed to upload payment proof screenshot');
      }

      // 2. Submit UTR & proof URL to verification endpoint
      const submitRes = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentId: order.paymentId || `pay-${order.id}`,
          amount: order.total,
          utr: trimmedUtr,
          proofImageUrl: uploadData.url,
        }),
      });

      const submitData = await submitRes.json() as { success?: boolean; error?: string; paymentStatus?: string };
      if (!submitRes.ok || !submitData.success) {
        throw new Error(submitData.error || 'Failed to submit payment verification');
      }

      showToast('Payment submitted successfully. Your payment is under review by our team.', 'success');
      setUtr('');
      setProofFile(null);
      setPreviewUrl(null);
      await fetchOrderDetails();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // UPI configuration fallback
  const merchantUpi = qrDetails?.upiId || '8081988627@pthdfc';
  const merchantName = qrDetails?.merchantName || 'FATAFAT';
  const finalAmount = Number(order?.total || qrDetails?.amount || 0);
  const formattedAmount = finalAmount.toFixed(2);
  const upiUri = qrDetails?.uri || `upi://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tr=${encodeURIComponent(order?.id || '')}`;

  // Status flags
  const isPaidOrConfirmed = order?.paymentStatus === 'PAID' || order?.status === 'Confirmed';
  const isRejected = order?.paymentStatus === 'REJECTED';
  const isPendingVerification = order?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING';
  const hasSubmittedProof = Boolean(order?.utr || order?.proofImageUrl);

  // 1. Loading State
  if (loading && !order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <div className="p-4 bg-brand-burgundy/5 rounded-full mb-4">
            <RefreshCw className="h-10 w-10 text-brand-burgundy animate-spin" />
          </div>
          <h2 className="text-xl font-serif font-black text-zinc-900">Loading Payment Gateway...</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Securely retrieving order specifications and live UPI gateway parameters for Order #{orderId}.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  // 2. Order Not Found / Access Error State
  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4">
            <XCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-serif font-black text-zinc-900">Order Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {fetchError || 'We could not locate this order in our records. Please verify in your Account Orders.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => router.push('/account/orders')}
              className="px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-burgundy-dark transition-all shadow"
            >
              Go to My Orders
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 rounded-full border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all"
            >
              Return Home
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-burgundy bg-brand-burgundy/10 px-3 py-1 rounded-full">
                Professional UPI Gateway
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 mt-2">
                Complete Your Payment
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Order <strong className="text-brand-burgundy font-extrabold">#{order.id}</strong> • Authoritative Server Total: <strong className="text-zinc-900 font-extrabold">₹{order.total}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ${
                isPaidOrConfirmed 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : isRejected 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : hasSubmittedProof 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isPaidOrConfirmed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Payment Confirmed
                  </>
                ) : isRejected ? (
                  <>
                    <XCircle className="h-3.5 w-3.5" /> Verification Rejected
                  </>
                ) : hasSubmittedProof ? (
                  <>
                    <Clock className="h-3.5 w-3.5" /> Under Verification
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" /> Payment Pending
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Dynamic Payment Gateway Card */}
            <div className="lg:col-span-7 space-y-6">

              {/* A: PAYMENT CONFIRMED / APPROVED STATE */}
              {isPaidOrConfirmed ? (
                <div className="bg-white border border-emerald-100 rounded-3xl p-8 shadow-sm text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full animate-bounce">
                      <CheckCircle2 className="h-12 w-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      Payment Confirmed ✓
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900">
                      Order Confirmed! 🎉
                    </h2>
                    <p className="text-xs text-zinc-600 leading-relaxed max-w-md mx-auto">
                      Thank you for choosing FATAFAT! Your UPI payment of ₹{order.total} has been verified and confirmed by our team. Your order is moving to fulfillment.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs space-y-3 text-left">
                    <div className="flex justify-between border-b pb-2.5">
                      <span className="text-zinc-400 font-bold">Order ID</span>
                      <span className="font-extrabold text-brand-burgundy">#{order.id}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2.5">
                      <span className="text-zinc-400 font-bold">Confirmed Amount</span>
                      <span className="font-extrabold text-zinc-900">₹{order.total}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2.5">
                      <span className="text-zinc-400 font-bold">Delivery Option</span>
                      <span className="font-extrabold text-zinc-800">{order.deliveryOption} ({order.eta})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-bold">Estimated Delivery</span>
                      <span className="font-extrabold text-green-700 flex items-center gap-1">
                        <Truck className="h-4 w-4" /> Within 12 hours
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link
                      href={`/track/${order.id}`}
                      className="px-8 py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-burgundy/10"
                    >
                      Track Order <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/account/orders"
                      className="px-8 py-3.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center"
                    >
                      View My Orders
                    </Link>
                  </div>
                </div>
              ) : isPendingVerification && hasSubmittedProof ? (

                /* B: UNDER VERIFICATION STATE */
                <div className="bg-white border border-amber-100 rounded-3xl p-8 shadow-sm text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-full animate-pulse">
                      <Clock className="h-12 w-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                      Under Verification
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900">
                      Payment Submitted Successfully
                    </h2>
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed max-w-md mx-auto">
                      Your payment proof has been submitted and is currently being reviewed by our team. Order confirmation will happen after payment verification.
                    </p>
                  </div>

                  {/* Details Card */}
                  <div className="p-5 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-xs space-y-3 text-left">
                    <div className="flex justify-between border-b border-amber-200/50 pb-2.5">
                      <span className="text-zinc-500 font-bold">Order ID</span>
                      <span className="font-extrabold text-brand-burgundy">#{order.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-amber-200/50 pb-2.5">
                      <span className="text-zinc-500 font-bold">Amount Submitted</span>
                      <span className="font-extrabold text-zinc-900">₹{order.total}</span>
                    </div>
                    <div className="flex justify-between border-b border-amber-200/50 pb-2.5">
                      <span className="text-zinc-500 font-bold">UTR Reference</span>
                      <span className="font-mono font-bold text-zinc-800">{order.utr || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">Payment Status</span>
                      <span className="font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Under Verification
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-600 text-left flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-brand-burgundy flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Our verification team reviews submissions continuously. This screen will automatically update to <strong>Order Confirmed</strong> once verified.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link
                      href={`/track/${order.id}`}
                      className="px-8 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-burgundy/10"
                    >
                      Track Order
                    </Link>
                    <Link
                      href="/account/orders"
                      className="px-8 py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center"
                    >
                      My Orders
                    </Link>
                  </div>
                </div>
              ) : (

                /* C: ACTIVE PAYMENT GATEWAY & PROOF SUBMISSION FORM */
                <div className="bg-white border border-zinc-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  
                  {/* If rejected, show rejection banner */}
                  {isRejected && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-left space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Payment Verification Failed</span>
                      </div>
                      <p className="text-xs text-red-600">
                        {order.rejectionReason || 'The payment proof did not match the submitted order details. Please complete the transfer and submit the correct UTR and screenshot.'}
                      </p>
                    </div>
                  )}

                  {/* Main Payment Card */}
                  <div className="rounded-3xl border border-brand-burgundy/20 bg-gradient-to-br from-brand-burgundy/[0.04] to-brand-burgundy/[0.01] p-6 sm:p-8 space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-serif font-black text-zinc-900">
                        Pay securely using UPI
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Amount to Pay: <strong className="text-brand-burgundy font-extrabold text-base">₹{order.total}</strong>
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-burgundy bg-[#FFF0EE] px-3.5 py-1 rounded-full">
                        Scan to Pay ₹{order.total}
                      </span>

                      <div className="border-4 border-white rounded-2xl shadow-xl overflow-hidden p-3 bg-white">
                        {qrLoading ? (
                          <div className="w-[240px] h-[240px] flex items-center justify-center bg-zinc-50">
                            <RefreshCw className="h-8 w-8 text-brand-burgundy animate-spin" />
                          </div>
                        ) : (
                          <QRCodeSVG 
                            value={upiUri} 
                            size={240} 
                            level="H" 
                            includeMargin={true}
                          />
                        )}
                      </div>

                      <p className="text-xs text-zinc-600 text-center font-medium max-w-xs">
                        Scan with any UPI app (GPay, PhonePe, Paytm, BHIM, CRED) and pay the exact amount.
                      </p>
                    </div>

                    {/* Merchant UPI ID Box */}
                    <div className="space-y-3 p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">UPI ID</p>
                        <h4 className="mt-1 text-xl sm:text-2xl font-serif font-black text-brand-burgundy tracking-wide select-all">
                          {merchantUpi}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-4 py-3 text-xs font-bold uppercase tracking-wider border border-zinc-200 rounded-xl bg-white text-zinc-700 hover:bg-zinc-50 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Copy className="h-4 w-4 text-zinc-500" />
                          COPY UPI ID
                        </button>
                        <a
                          href={upiUri}
                          className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-brand-burgundy text-white rounded-xl text-center hover:bg-brand-burgundy-dark active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          PAY VIA UPI APP
                        </a>
                      </div>
                    </div>

                    {/* 3-Step Instructions */}
                    <div className="space-y-2.5 p-5 bg-white rounded-2xl border border-zinc-100 text-xs text-zinc-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">How to Complete Payment:</h4>
                      <ol className="space-y-2 list-decimal list-inside text-zinc-600 font-medium">
                        <li>Scan the QR code or use &quot;Pay via UPI App&quot;</li>
                        <li>Complete the payment for the exact amount (<strong className="text-zinc-900">₹{order.total}</strong>)</li>
                        <li>Enter your UTR and upload the payment screenshot below</li>
                      </ol>
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-800 font-semibold text-[11px]">
                        ⚠️ Your order will be confirmed only after our team verifies your payment.
                      </div>
                    </div>

                  </div>

                  {/* Payment Verification Form */}
                  <form onSubmit={handleProofSubmit} className="rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 sm:p-8 space-y-5">
                    <div>
                      <h3 className="text-sm font-serif font-extrabold text-zinc-900">Payment Verification</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Submit your transaction details to verify payment and confirm your order.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* UTR Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 flex justify-between">
                          <span>UTR / Transaction Reference *</span>
                          <span className="text-zinc-400 font-normal">12-digit transaction ID</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={utr}
                          onChange={(e) => setUtr(e.target.value)}
                          placeholder="Enter the UTR / transaction reference from your UPI payment"
                          className="w-full border border-zinc-200 rounded-xl p-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20 font-mono text-zinc-800"
                        />
                        <p className="text-[10px] text-zinc-400">Available in your GPay / PhonePe / Paytm / BHIM transaction summary.</p>
                      </div>

                      {/* Screenshot Upload with Live Preview */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                          Payment Screenshot *
                        </label>
                        
                        <div className="border-2 border-dashed border-zinc-300 rounded-xl p-5 bg-white hover:bg-zinc-50 transition-colors text-center cursor-pointer relative">
                          <input
                            type="file"
                            required
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          
                          {previewUrl ? (
                            <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-200 shadow-sm bg-zinc-100">
                                <Image 
                                  src={previewUrl} 
                                  alt="Payment Proof Preview" 
                                  fill 
                                  className="object-cover" 
                                />
                              </div>
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <Check className="h-4 w-4" /> {proofFile?.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">Click to replace screenshot</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                              <UploadCloud className="h-8 w-8 text-zinc-400" />
                              <span className="text-xs font-bold text-zinc-700">
                                Choose File or Drag & Drop
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                Image files only (PNG, JPG, WebP up to 8MB)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingProof || !utr.trim() || !proofFile}
                      className="w-full bg-brand-burgundy text-white font-bold rounded-xl px-4 py-4 text-xs uppercase tracking-wider hover:bg-brand-burgundy-dark active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-burgundy/10 flex items-center justify-center gap-2"
                    >
                      {isSubmittingProof ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Submitting Payment for Verification...</span>
                        </>
                      ) : (
                        <span>SUBMIT PAYMENT FOR VERIFICATION</span>
                      )}
                    </button>
                  </form>

                </div>
              )}

            </div>

            {/* Right Column: Order & Item Summary */}
            <div className="lg:col-span-5 space-y-6">

              {/* Order Summary Card */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-serif font-bold tracking-wide border-b pb-3 border-zinc-100 flex items-center gap-2 text-zinc-900">
                  <ShoppingBag className="h-4 w-4 text-brand-burgundy" /> Order Summary
                </h3>

                {/* Items List */}
                <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate text-zinc-800">{item.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          Qty: {item.quantity} {item.selectedSize && `• Size: ${item.selectedSize}`} {item.selectedType && `• ${item.selectedType}`}
                        </p>
                      </div>
                      <span className="font-semibold text-zinc-700 shrink-0">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4 space-y-2 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-zinc-800">₹{order.subtotal}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Promo Discount</span>
                      <span>-₹{order.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-medium text-zinc-800">
                      {order.deliveryFee === 0 ? <span className="text-green-600 font-bold uppercase text-[9px]">Free</span> : `₹${order.deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-800 border-t pt-3 mt-2">
                    <span>Grand Total</span>
                    <span className="text-base text-brand-burgundy font-black">₹{order.total}</span>
                  </div>
                </div>

                {/* Delivery Address Box */}
                <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border text-xs leading-relaxed">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 mb-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-brand-burgundy" /> Delivery Destination
                  </h4>
                  <p className="text-zinc-700">
                    <strong>{order.address.name}</strong> • +91 {order.address.mobile} <br />
                    {order.address.house}, {order.address.street}, <br />
                    {order.address.area}, {order.address.city} - {order.address.pincode}
                  </p>
                  {order.address.landmark && (
                    <p className="text-[10px] text-[#7A6010] bg-brand-gold/10 px-2 py-0.5 rounded inline-block mt-1">
                      📍 {order.address.landmark}
                    </p>
                  )}
                </div>

                {/* Secure Trust Guarantee */}
                <div className="p-3 bg-zinc-50 rounded-xl border text-[10px] text-zinc-500 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-brand-gold flex-shrink-0" />
                  <span>Discreet packaging & direct hub dispatch for all orders.</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
