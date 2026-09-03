'use client';

import React from 'react';
import { Truck, Clock, ShieldAlert, Sparkles, MapPin } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function DeliveryPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          <Breadcrumbs />

          {/* Hero */}
          <div className="text-center py-6 space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">
              Delivery Logistics & Guidelines
            </h1>
            <p className="text-xs text-zinc-500">
              How we package, carry, and deliver freshness to your doorstep in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Box 1 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 text-xs">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-zinc-800">Delivery Options</h3>
              <ul className="space-y-3 text-zinc-600 leading-relaxed list-disc pl-4">
                <li>
                  <strong>Deliver ASAP:</strong> For celebrations, our runners deliver within 12 hours.
                </li>
                <li>
                  <strong>Scheduled Delivery:</strong> Pre-book time slots (e.g. 10:00 AM - 12:00 PM) for event planning.
                </li>
                <li>
                  <strong>Midnight Surprise:</strong> Special slots from 9:00 PM to 11:59 PM to surprise your loved ones.
                </li>
              </ul>
            </div>

            {/* Box 2 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 text-xs">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-zinc-800">Fees & Surcharges</h3>
              <ul className="space-y-3 text-zinc-600 leading-relaxed list-disc pl-4">
                <li>
                  <strong>Free Shipping:</strong> All order values above ₹799 qualify for free shipping automatically.
                </li>
                <li>
                  <strong>Standard Surcharge:</strong> Orders under ₹799 carry a flat delivery runner charge of ₹49.
                </li>
                <li>
                  <strong>No Hidden Surcharges:</strong> Rain, holiday, or surge charges are completely absorbed by us.
                </li>
              </ul>
            </div>

            {/* Box 3 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 text-xs">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-zinc-800">Discreet Packing Promise</h3>
              <p className="text-zinc-600 leading-relaxed">
                We respect your boundaries. All adult-wellness category shipments are packed in heavy plain cardboard boxes with unbranded receiver coordinates. The label mentions &ldquo;VM Logistics,&rdquo; keeping your order confidential.
              </p>
            </div>

            {/* Box 4 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 text-xs">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-zinc-800">Fulfillment Hubs</h3>
              <p className="text-zinc-600 leading-relaxed">
                We operate multiple localized dark kitchens and temperature-controlled florist hubs to ensure that cakes don&apos;t melt and flowers stay fresh during transit.
              </p>
            </div>

          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
