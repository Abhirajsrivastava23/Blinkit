'use client';

import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] text-[#1C1A17] font-sans">
        
        {/* Breadcrumb banner strip */}
        <div className="border-b border-zinc-200/20 py-4 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-24">
          
          {/* Hero: More Than a Store. We Deliver Moments. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.3em] block">
                ABOUT FATAFAT
              </span>
              <h1 className="text-4xl sm:text-5xl font-serif font-black text-zinc-900 leading-[1.1] tracking-tight">
                More Than a Store. <br />
                We Deliver <span className="font-serif italic text-brand-burgundy font-normal">Moments.</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-550 leading-relaxed max-w-lg font-medium">
                FATAFAT was founded on the belief that life&apos;s beautiful moments deserve beautiful things. We bundle artisanal pastry craftsmanship with fresh flower bouquets and carry them to doorsteps when it matters most.
              </p>
            </div>
            
            <div className="lg:col-span-5 relative h-80 w-full rounded-3xl overflow-hidden shadow-xl border border-white/50 bg-zinc-100">
              <img
                src="https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=700&auto=format&fit=crop&q=80"
                alt="Table setup"
                className="w-full h-full object-cover animate-pulse"
              />
            </div>
          </div>

          {/* Section 1: Our Story (Text Left, Image Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4 text-left">
              <span className="text-[9px] text-brand-gold font-extrabold uppercase tracking-widest block">01 / BRAND GENESIS</span>
              <h3 className="text-2xl font-serif font-extrabold text-zinc-900">Our Story</h3>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                FATAFAT began as a simple realization: the most important moments in life—birthdays, acts of romantic gratitude, congratulations, or quiet self-care—frequently deserve immediate celebration. Yet, ordering a premium cake or luxury flowers has always involved hours of advance planning.
              </p>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                We designed a platform to bridge the gap: matching premium artisanal quality with quick-commerce speed. By partnering with gourmet chefs, florist masters, and premium creators, we ensure your acts of care are delivered fresh within 12 hours.
              </p>
            </div>
            <div className="relative h-72 w-full rounded-3xl overflow-hidden border border-zinc-200/25 shadow-md">
              <img 
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80" 
                alt="Close up chocolate velvet cake details photoshoot" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Section 2: Our Mission (Image Left, Text Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
            <div className="relative h-72 w-full rounded-3xl overflow-hidden border border-zinc-200/25 shadow-md md:order-first">
              <img 
                src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&auto=format&fit=crop&q=80" 
                alt="Floral bouquet arrangement workspace" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-4 text-left">
              <span className="text-[9px] text-brand-gold font-extrabold uppercase tracking-widest block">02 / PURPOSE</span>
              <h3 className="text-2xl font-serif font-extrabold text-zinc-900">Our Mission</h3>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                To elevate celebration logistics by delivering fresh, premium flowers, artisanal bakery treats, and thoughtful wellness products to doorsteps instantly, making every moment feel special.
              </p>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                We don&apos;t compromise. By coordinating dedicated runner networks with strict temperature-controlled logistics, we guarantee that the visual presentation of every hamper and bouquet remains pristine from dispatch to delivery.
              </p>
            </div>
          </div>

          {/* Section 3: Our Vision (Text Left, Image Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4 text-left">
              <span className="text-[9px] text-brand-gold font-extrabold uppercase tracking-widest block">03 / ASPIRATION</span>
              <h3 className="text-2xl font-serif font-extrabold text-zinc-900">Our Vision</h3>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                To become the definitive quick-commerce companion for lifestyle luxury, self-indulgence, and thoughtful gifting—merging convenience with uncompromising craft.
              </p>
              <p className="text-xs text-zinc-550 leading-relaxed font-medium">
                We aim to redefine gifting from a chore of scheduling into an act of spontaneous joy. Whether it is a midnight surprise cake or a simple floral gesture in the afternoon, FATAFAT turns thoughts into immediate tactile reality.
              </p>
            </div>
            <div className="relative h-72 w-full rounded-3xl overflow-hidden border border-zinc-200/25 shadow-md">
              <img 
                src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80" 
                alt="Gifting hamper with ribbon wrapping" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Section 4: Our Values (Numbered columns grid) */}
          <div className="space-y-8 border-t border-zinc-200/30 pt-16">
            <h3 className="text-2xl font-serif font-extrabold text-zinc-900 text-center">Our Values</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 text-left">
              <div className="space-y-2">
                <span className="text-4xl font-serif font-extrabold text-brand-gold block select-none">01</span>
                <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-xs">Quality</h4>
                <p className="text-[11px] text-zinc-550 leading-relaxed font-medium">
                  We don&apos;t compromise. Every bakery slice is chef-baked and every bouquet florist-arranged.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-4xl font-serif font-extrabold text-brand-gold block select-none">02</span>
                <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-xs">Trust</h4>
                <p className="text-[11px] text-zinc-550 leading-relaxed font-medium">
                  Spontaneous gifts require secure systems. We protect checkout details and deliver promises.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-4xl font-serif font-extrabold text-brand-gold block select-none">03</span>
                <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-xs">Speed</h4>
                <p className="text-[11px] text-zinc-550 leading-relaxed font-medium">
                  spontaneous ideas demand fast execution. Our runners dispatch within minutes.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-4xl font-serif font-extrabold text-brand-gold block select-none">04</span>
                <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-xs">Care</h4>
                <p className="text-[11px] text-zinc-550 leading-relaxed font-medium">
                  Every parcel is treated as a beautiful gift box, featuring delicate wrappings and envelopes.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Our Promise Block */}
          <div className="bg-brand-burgundy text-white rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl border border-brand-burgundy/10">
            <span className="text-[9px] text-brand-gold font-extrabold uppercase tracking-[0.25em] block">THE FATAFAT PROMISE</span>
            <h3 className="text-2xl font-serif font-extrabold"> спонтанная радость, Spontaneous Delivery.</h3>
            <p className="text-xs max-w-xl mx-auto leading-relaxed text-zinc-300 font-medium">
              We pledge to provide cakes baked with organic dairy materials, flowers hand-arranged by master florists, compliance-guaranteed adult wellness items with discreet packing overlays, and prompt runner fulfillment loops.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
