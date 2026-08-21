'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';

const FAQS = [
  {
    q: 'How fast is your delivery?',
    a: 'We offer quick-commerce delivery. For immediate orders (ASAP), we deliver within 30 to 60 minutes. You can also schedule delivery for a future time slot (including midnight surprise deliveries).'
  },
  {
    q: 'Are the cakes freshly baked?',
    a: 'Absolutely! All cakes and bakery products are fresh-baked on order by our partner kitchen chefs using wholesome organic materials. We never freeze or deliver stale batches.'
  },
  {
    q: 'What is the refund eligibility policy?',
    a: 'Since we deal in highly perishable fresh desserts and bouquets, refunds/cancellations are supported only before prep/assembly begins. Please review the Refund Policy page for details.'
  },
  {
    q: 'Why does the Wellness section require age verification?',
    a: 'To comply with regulatory guidelines for the sale of sensitive adult products, we verify that shoppers are at least 18 years old. We also ship all wellness items in discreet packaging.'
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Hero */}
          <div className="text-center py-6 space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">
              Frequently Asked Questions
            </h1>
            <p className="text-xs text-zinc-500">
              Quick answers regarding fresh desserts, flower shipping, payment codes, and operations.
            </p>
          </div>

          {/* FAQ list */}
          <div className="space-y-4 max-w-2xl mx-auto">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index} className="bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4 text-xs font-bold text-zinc-800 focus:outline-none"
                  >
                    <span className="flex items-center gap-2"><HelpCircle className="h-4.5 w-4.5 text-brand-burgundy shrink-0" /> {faq.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-zinc-600 leading-relaxed border-t border-zinc-50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
