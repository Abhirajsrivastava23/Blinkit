'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  Eye
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useOrders, Order } from '../../../context/OrderContext';
import { useToast } from '../../../components/Toast';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById } = useOrders();
  const { showToast } = useToast();
  
  const orderId = params.id as string;
  const contextOrder = getOrderById(orderId);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form states for manual UPI payment proof submission
  const [utr, setUtr] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [showReuploadForm, setShowReuploadForm] = useState(false);

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
          setFetchError(errData.error || `HTTP Error ${res.status}`);
        }
      }
    } catch (err) {
      console.error('Error polling order details:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, contextOrder, fetchedOrder]);

  useEffect(() => {
    void fetchOrderDetails();
    const interval = setInterval(() => {
      void fetchOrderDetails();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchOrderDetails]);

  const order = fetchedOrder || contextOrder;

  const handleCopyUpi = async () => {
    const upiId = '8081988627@pthdfc';
    try {
      await navigator.clipboard.writeText(upiId);
      showToast('UPI ID copied to clipboard: 8081988627@pthdfc', 'success');
    } catch {
      showToast('Please copy manually: 8081988627@pthdfc', 'info');
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const trimmedUtr = utr.trim();
    if (!trimmedUtr) {
      showToast('Please enter the 12-digit UTR / transaction reference number.', 'error');
      return;
    }

    if (!proofFile) {
      showToast('Please attach a screenshot of your completed payment transfer.', 'error');
      return;
    }

    try {
      setIsSubmittingProof(true);

      // 1. Upload proof screenshot
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

      // 2. Submit payment proof to verification API
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
        throw new Error(submitData.error || 'Failed to record payment proof submission');
      }

      showToast('Payment submitted successfully. Your payment is under review by our team.', 'success');
      setUtr('');
      setProofFile(null);
      setShowReuploadForm(false);
      await fetchOrderDetails();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  if (loading && !order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <RefreshCw className="h-10 w-10 text-brand-burgundy mb-4 animate-spin" />
          <h2 className="text-lg font-bold font-serif text-zinc-800">Loading Order & Payment Details...</h2>
          <p className="text-xs text-zinc-400 mt-1">Connecting to live database records for Order #{orderId}.</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <div className="p-4 bg-red-50 text-red-600 rounded-full mb-3">
            <XCircle className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold font-serif text-zinc-800">Order Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {fetchError || 'We could not locate this order in our live records. Please check your active orders inside your Account.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push('/account/orders')}
              className="px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-burgundy-dark transition-all shadow"
            >
              View My Orders
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

  const isPaidOrConfirmed = order.paymentStatus === 'PAID' || order.status === 'Confirmed';
  const isRejected = order.paymentStatus === 'REJECTED';
  const isPendingVerification = order.paymentStatus === 'PAYMENT_VERIFICATION_PENDING';
  const hasSubmittedProof = Boolean(order.utr || order.proofImageUrl);

  // Merchant details
  const merchantUpiId = '8081988627@pthdfc';
  const merchantName = 'FATAFAT';
  const orderAmount = Number(order.total || 0);
  const formattedAmount = orderAmount.toFixed(2);
  const upiUri = `upi://pay?pa=${merchantUpiId}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tr=${encodeURIComponent(order.id)}`;

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">

          {/* STATE A: PAYMENT CONFIRMED / APPROVED */}
          {isPaidOrConfirmed ? (
            <div className="bg-white border border-emerald-100 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full animate-bounce">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Payment Confirmed
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900">
                  Order Confirmed! 🎉
                </h1>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
                  Thank you for celebrating with FATAFAT! Your UPI payment has been verified and confirmed by our team. Your order is moving into fulfillment.
                </p>
              </div>

              {/* Order Specs Block */}
              <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs space-y-3 max-w-md mx-auto text-left">
                <div className="flex justify-between border-b pb-2.5">
                  <span className="text-zinc-400 font-bold">Order ID</span>
                  <span className="font-extrabold text-brand-burgundy">#{order.id}</span>
                </div>
                <div className="flex justify-between border-b pb-2.5">
                  <span className="text-zinc-400 font-bold">Total Paid</span>
                  <span className="font-extrabold text-zinc-900">₹{order.total}</span>
                </div>
                <div className="flex justify-between border-b pb-2.5">
                  <span className="text-zinc-400 font-bold">Payment Status</span>
                  <span className="font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Payment Confirmed
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">Estimated Delivery</span>
                  <span className="font-extrabold flex items-center gap-1 text-green-700">
                    <Truck className="h-4 w-4" /> Within 12 hours
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  href={`/track/${order.id}`}
                  className="px-8 py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-burgundy/10 group"
                >
                  Track Delivery <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/account/orders"
                  className="px-8 py-3.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center"
                >
                  View All Orders
                </Link>
              </div>
            </div>
          ) : isPendingVerification && hasSubmittedProof && !showReuploadForm ? (
            
            /* STATE B: PAYMENT UNDER REVIEW (PROOF SUBMITTED, AWAITING ADMIN APPROVAL) */
            <div className="bg-white border border-amber-100 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-full animate-pulse">
                  <Clock className="h-12 w-12" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                  Under Admin Review
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900">
                  Payment Submitted Successfully
                </h1>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed max-w-md mx-auto">
                  Your payment is under review by our team. Order confirmation will happen after payment verification.
                </p>
              </div>

              {/* Order Status Info Box */}
              <div className="p-5 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-xs space-y-3 max-w-md mx-auto text-left">
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
                    Under Review
                  </span>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-600 max-w-md mx-auto text-left flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-brand-burgundy flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Our admin team verifies transactions on weekdays & weekends within minutes. This page will update automatically once verified.
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

            /* STATE C: ACTIVE PAYMENT SCREEN (QR CODE, UPI ID, UTR INPUT, SCREENSHOT PICKER) */
            <div className="space-y-6">

              {/* Header Title */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="border-b pb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-burgundy bg-brand-burgundy/10 px-3 py-1 rounded-full">
                    Secure Manual UPI Verification
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900 mt-3">
                    PAY SECURELY VIA UPI
                  </h1>
                  <p className="text-xs text-zinc-500 mt-1">
                    Amount to Pay: <strong className="text-zinc-900 font-extrabold text-base">₹{order.total}</strong> • Order <strong className="text-brand-burgundy">#{order.id}</strong>
                  </p>
                </div>

                {/* If payment was rejected previously, show alert */}
                {isRejected && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-left space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Payment Verification Rejected</span>
                    </div>
                    <p className="text-xs text-red-600">
                      {order.rejectionReason || 'The previous payment proof could not be verified. Please make the transfer and submit the correct UTR and screenshot.'}
                    </p>
                  </div>
                )}

                {/* Large Scannable QR Code & UPI Card */}
                <div className="mt-6 rounded-3xl border border-brand-burgundy/20 bg-gradient-to-br from-brand-burgundy/[0.04] to-brand-burgundy/[0.01] p-6 sm:p-8 space-y-6">
                  
                  {/* Dynamic QR Code Display */}
                  <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-burgundy bg-[#FFF0EE] px-3.5 py-1 rounded-full">
                      Scan to Pay ₹{order.total}
                    </span>
                    <div className="border-4 border-white rounded-2xl shadow-xl overflow-hidden p-3 bg-white">
                      <QRCodeSVG 
                        value={upiUri} 
                        size={240} 
                        level="H" 
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-xs text-zinc-600 text-center font-medium max-w-xs">
                      Scan the QR using any UPI app (GPay, PhonePe, Paytm, BHIM, CRED) and pay the exact amount.
                    </p>
                  </div>

                  {/* Merchant UPI ID Card */}
                  <div className="space-y-3 p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">FATAFAT UPI ID</p>
                      <h4 className="mt-1 text-xl sm:text-2xl font-serif font-black text-brand-burgundy tracking-wide select-all">
                        {merchantUpiId}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
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
                        className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-brand-burgundy text-white rounded-xl text-center hover:bg-[#541424] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        PAY VIA UPI APP
                      </a>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  <div className="space-y-2 p-5 bg-white rounded-2xl border border-zinc-100 text-xs text-zinc-700">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">Instructions:</h4>
                    <ol className="space-y-1.5 list-decimal list-inside text-zinc-600 font-medium">
                      <li>Scan the QR code above or copy the UPI ID <strong className="text-zinc-900">{merchantUpiId}</strong> into your payment app.</li>
                      <li>Pay the exact order amount: <strong className="text-zinc-900">₹{order.total}</strong>.</li>
                      <li>Copy the 12-digit UTR / transaction ID and take a screenshot of the payment receipt.</li>
                      <li>Enter the UTR below, attach your screenshot, and click submit.</li>
                    </ol>
                  </div>

                </div>

                {/* Proof Submission Form */}
                <form onSubmit={handleProofSubmit} className="mt-6 rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 sm:p-8 space-y-5">
                  <div>
                    <h3 className="text-sm font-serif font-extrabold text-zinc-900">Submit Payment Proof</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Provide your payment transfer details for admin verification and order confirmation.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* UTR Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 flex justify-between">
                        <span>UTR / TRANSACTION REFERENCE *</span>
                        <span className="text-zinc-400 font-normal">12-digit ID</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="e.g., 202609011234567890"
                        className="w-full border border-zinc-200 rounded-xl p-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20 font-mono text-zinc-800"
                      />
                      <p className="text-[10px] text-zinc-400">Available in your GPay / PhonePe / Paytm / BHIM transaction summary.</p>
                    </div>

                    {/* Screenshot File Upload */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                        PAYMENT PROOF SCREENSHOT *
                      </label>
                      <div className="border-2 border-dashed border-zinc-300 rounded-xl p-5 bg-white hover:bg-zinc-50 transition-colors text-center cursor-pointer relative">
                        <input
                          type="file"
                          required
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setProofFile(file || null);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                          <UploadCloud className="h-8 w-8 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-700">
                            {proofFile ? proofFile.name : 'Choose File or Drag & Drop'}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            PNG, JPEG, or WebP up to 8MB.
                          </span>
                        </div>
                      </div>
                      {proofFile && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold pt-1">
                          <Check className="h-4 w-4" /> Ready for upload: {proofFile.name}
                        </div>
                      )}
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
                        <span>Submitting Payment Proof...</span>
                      </>
                    ) : (
                      <span>SUBMIT PAYMENT FOR VERIFICATION</span>
                    )}
                  </button>
                </form>

              </div>

            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 pt-2">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            <span>Compliant discreet packaging holds privacy for all sensitive products.</span>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}

