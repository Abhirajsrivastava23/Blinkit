'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { 
  ArrowRight, 
  HelpCircle, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CreditCard, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Package, 
  Sparkles,
  Phone,
  Mail,
  FileText
} from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-zinc-850 text-left">
      <Header />
      
      <main className="flex-grow py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Page Header */}
          <div className="border-b border-zinc-200/80 pb-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-brand-burgundy/10 text-brand-burgundy">
                FATAFAT Commerce • Official Policy
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-black text-zinc-900 tracking-tight">
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
              Clear, fair, and transparent guidelines on order cancellations, culinary preparation cut-offs, doorstep damage claims, and Razorpay gateway refund processing.
            </p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-1">
              Effective Date: September 2026 • Applies to all FATAFAT web and app purchases
            </p>
          </div>

          {/* Key Policy Highlights (4-Card Summary Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-emerald-200/60 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-zinc-900 text-xs">Pre-Preparation Window</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Full cancellation & refund is available while your order is in <strong>Order Placed</strong>, <strong>Pending</strong>, or <strong>Confirmed</strong> state.
              </p>
            </div>

            <div className="bg-white border border-amber-200/60 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-zinc-900 text-xs">The &ldquo;Preparing&rdquo; Cut-off</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Once culinary baking or floral crafting starts (<strong>Preparing</strong> state), self-service cancellation & refunds are permanently closed.
              </p>
            </div>

            <div className="bg-white border border-blue-200/60 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-zinc-900 text-xs">Damaged / Wrong Items</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Report damaged packaging or incorrect variants with photo proof within <strong>2 hours of delivery</strong> for swift replacement or refund.
              </p>
            </div>

            <div className="bg-white border border-purple-200/60 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <CreditCard className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-zinc-900 text-xs">Original Payment Method</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Approved refunds are processed via Razorpay back to your original source (UPI: 24–48 hrs, Cards: 5–7 business days).
              </p>
            </div>

          </div>

          {/* Main Content Layout with Sticky Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Sticky Table of Contents */}
            <aside className="md:col-span-4 sticky top-28 bg-white border border-zinc-200/70 rounded-2xl p-5 shadow-xs space-y-3 shrink-0">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">
                Policy Sections
              </span>
              <nav className="flex flex-col gap-2.5 text-xs font-semibold text-zinc-600">
                <a href="#pre-preparation" className="hover:text-brand-burgundy transition-colors flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">01.</span> Pre-Preparation Window
                </a>
                <a href="#preparing-cutoff" className="hover:text-brand-burgundy transition-colors flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">02.</span> The &ldquo;Preparing&rdquo; Cut-Off Rule
                </a>
                <a href="#damaged-items" className="hover:text-brand-burgundy transition-colors flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">03.</span> Damaged or Incorrect Delivery
                </a>
                <a href="#non-perishables" className="hover:text-brand-burgundy transition-colors flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">04.</span> Non-Perishable Accessories
                </a>
                <a href="#razorpay-timelines" className="hover:text-brand-burgundy transition-colors flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">05.</span> Gateway Refund Timelines
                </a>
                <a href="#how-to-request" className="hover:text-brand-burgundy transition-colors flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[10px]">06.</span> How to Request in Account
                </a>
              </nav>

              <div className="pt-3 border-t border-zinc-100">
                <Link
                  href="/account/orders"
                  className="w-full py-2 px-3 bg-brand-burgundy/10 hover:bg-brand-burgundy/20 text-brand-burgundy font-bold text-[11px] rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>Go to My Orders</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </aside>

            {/* Right Detailed Sections */}
            <div className="md:col-span-8 bg-white border border-zinc-200/70 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-xs sm:text-sm text-zinc-700 leading-relaxed">
              
              {/* Section 1 */}
              <div id="pre-preparation" className="space-y-3 scroll-mt-28">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-brand-burgundy/10 text-brand-burgundy font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-base font-serif font-bold text-zinc-900">
                    Pre-Preparation Cancellation & Refund Eligibility
                  </h2>
                </div>
                <p>
                  At FATAFAT, we believe in customer flexibility. You are eligible to request an immediate cancellation and 100% full refund as long as your order has not entered the kitchen preparation stage.
                </p>
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl space-y-1.5 text-xs">
                  <span className="font-bold text-emerald-900 block flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> Eligible Order Statuses:
                  </span>
                  <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                    <li><strong>Order Placed / Pending</strong> — Order received and awaiting queue confirmation.</li>
                    <li><strong>Confirmed / Payment Confirmed</strong> — Inventory reserved; preparation not yet initiated.</li>
                  </ul>
                </div>
                <p className="text-zinc-500 text-xs">
                  During these eligible states, you will see an active <strong>&ldquo;Request Refund&rdquo;</strong> button in your <em>Account → Orders</em> dashboard.
                </p>
              </div>

              {/* Section 2 */}
              <div id="preparing-cutoff" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-base font-serif font-bold text-zinc-900">
                    The &ldquo;Preparing&rdquo; Stage Cut-Off Rule
                  </h2>
                </div>
                <p>
                  Our artisanal cakes, pastries, custom greeting inscriptions, and fresh floral bouquets are handcrafted on-demand to guarantee unmatched freshness and celebratory quality.
                </p>
                <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-amber-950 block flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" /> Why self-service refund closes at &ldquo;Preparing&rdquo;:
                  </span>
                  <p className="text-amber-900 leading-normal">
                    Once an order enters <strong>Preparing</strong>, fresh perishable ingredients are consumed, customized calligraphy/photos are applied, and packaging materials are assembled specifically for your recipient. Consequently, <strong>cancellation or self-service refund requests cannot be accepted</strong> once preparation has started.
                  </p>
                </div>
                <p className="text-zinc-500 text-xs">
                  Non-eligible statuses where refund requests are permanently disabled: <strong>Preparing</strong>, <strong>Packed</strong>, <strong>Picked Up</strong>, <strong>Out for Delivery</strong>, and <strong>Delivered</strong>.
                </p>
              </div>

              {/* Section 3 */}
              <div id="damaged-items" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-base font-serif font-bold text-zinc-900">
                    Damaged, Defective, or Incorrect Deliveries
                  </h2>
                </div>
                <p>
                  We take utmost care in transit. However, in the rare event that your product arrives in a damaged condition (such as collapsed icing, broken packaging) or you received an incorrect flavour/item:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <Clock className="h-4 w-4 text-brand-burgundy mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-zinc-900">Report within 2 hours:</strong>
                      <p className="text-zinc-600 mt-0.5">
                        Please notify our customer support team within 2 hours of doorstep delivery with your Order ID and clear photographic evidence of the damaged or incorrect item.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-zinc-900">Prompt Resolution:</strong>
                      <p className="text-zinc-600 mt-0.5">
                        Upon swift operational validation, we will arrange a priority free redelivery/replacement or process a full refund to your original payment method.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div id="non-perishables" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <h2 className="text-base font-serif font-bold text-zinc-900">
                    Non-Perishable Accessories & Hampers
                  </h2>
                </div>
                <p>
                  Non-perishable celebration merchandise, dry gift sets, candles, greeting accessories, and wellness goods are eligible for returns within <strong>7 calendar days</strong> from the delivery date, provided the product is completely unused, with original security seals, tags, and hygiene packaging intact.
                </p>
              </div>

              {/* Section 5 */}
              <div id="razorpay-timelines" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-brand-burgundy/10 text-brand-burgundy font-bold text-xs flex items-center justify-center">
                    5
                  </span>
                  <h2 className="text-base font-serif font-bold text-zinc-900">
                    Razorpay Gateway Refund Processing & Settlement Timelines
                  </h2>
                </div>
                <p>
                  All approved refunds are initiated through our official payment gateway (Razorpay) directly to the original payment method used during checkout. Please note that settlement cycles depend on your banking partner:
                </p>
                
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <th className="p-3">Payment Method</th>
                        <th className="p-3">Refund Destination</th>
                        <th className="p-3">Standard Settlement Cycle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700">
                      <tr>
                        <td className="p-3 font-bold text-zinc-900">UPI (GPay / PhonePe / Paytm / BHIM)</td>
                        <td className="p-3">Linked Primary Bank Account</td>
                        <td className="p-3 font-semibold text-emerald-800">24 to 48 banking hours</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-zinc-900">Credit / Debit Cards (Visa / MC / RuPay)</td>
                        <td className="p-3">Original Card Account</td>
                        <td className="p-3 font-semibold text-zinc-800">5 to 7 business days</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-zinc-900">NetBanking</td>
                        <td className="p-3">Originating Bank Account</td>
                        <td className="p-3 font-semibold text-zinc-800">3 to 5 business days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-zinc-500 italic">
                  * Note: Bank clearance cycles are governed by the customer&apos;s card-issuing bank and NPCI/RBI clearing guidelines. Once FATAFAT issues the refund ARN/reference ID, your bank credits the amount accordingly.
                </p>
              </div>

              {/* Section 6 */}
              <div id="how-to-request" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-xs flex items-center justify-center">
                    6
                  </span>
                  <h2 className="text-base font-serif font-bold text-zinc-900">
                    Step-by-Step: How to Request a Refund
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-[10px] font-bold text-brand-burgundy uppercase tracking-wider block">Step 1</span>
                    <strong className="text-zinc-900 block">Go to My Orders</strong>
                    <p className="text-zinc-500 text-[11px]">Navigate to your account orders list or open your order details page.</p>
                  </div>
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-[10px] font-bold text-brand-burgundy uppercase tracking-wider block">Step 2</span>
                    <strong className="text-zinc-900 block">Click &ldquo;Request Refund&rdquo;</strong>
                    <p className="text-zinc-500 text-[11px]">Available while order is in Placed / Pending / Confirmed state.</p>
                  </div>
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-[10px] font-bold text-brand-burgundy uppercase tracking-wider block">Step 3</span>
                    <strong className="text-zinc-900 block">Track Review Status</strong>
                    <p className="text-zinc-500 text-[11px]">Operations team reviews and initiates Razorpay gateway refund.</p>
                  </div>
                </div>
              </div>

              {/* Help & Support Desk Banner */}
              <div className="border-t border-dashed border-zinc-200 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs bg-[#FAF9F6] p-4 rounded-2xl border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-brand-burgundy shrink-0" />
                    <span className="font-bold text-zinc-900 text-xs">Have questions about an ongoing order or refund?</span>
                  </div>
                  <p className="text-zinc-500 text-[11px]">Our customer support team is available daily from 8:00 AM to 11:00 PM.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href="/contact"
                    className="px-3.5 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Contact Support</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
