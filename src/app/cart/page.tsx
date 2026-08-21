'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, X, Plus, Minus, Trash2, Tag, ArrowRight, AlertCircle } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useCart } from '../../context/CartContext';

export default function CartPage() {
  const router = useRouter();
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    subtotal,
    deliveryFee,
    total,
    amountToFreeDelivery,
    promoCode,
    promoError,
    discountAmount,
    applyPromoCode,
    removePromoCode
  } = useCart();

  const [couponInput, setCouponInput] = useState('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      const success = applyPromoCode(couponInput);
      if (success) {
        setCouponInput('');
      }
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <Breadcrumbs />

          <div className="mb-8 space-y-1.5 text-center sm:text-left">
            <h1 className="text-3xl font-serif font-extrabold text-[#1A1A1A]">
              Shopping Cart
            </h1>
            <p className="text-xs text-zinc-500">
              Review items and pricing details before finalizing delivery options.
            </p>
          </div>

          {cartItems.length === 0 ? (
            /* Empty State */
            <div className="bg-white border border-zinc-100 rounded-3xl p-16 text-center max-w-md mx-auto shadow-sm space-y-4">
              <div className="flex justify-center text-brand-burgundy/25">
                <ShoppingBag className="h-14 w-14" />
              </div>
              <h2 className="text-base font-bold font-serif">Your cart is empty</h2>
              <p className="text-xs text-zinc-400">
                Looks like you haven&apos;t added any sweet treats or flowers yet!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider transition-colors shadow"
              >
                Go to Shop
              </Link>
            </div>
          ) : (
            /* Columns layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Items list */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Proximity alert */}
                {amountToFreeDelivery > 0 ? (
                  <div className="p-4 bg-brand-burgundy/5 border border-brand-burgundy/10 rounded-2xl text-xs text-brand-burgundy flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Add <strong>₹{amountToFreeDelivery}</strong> more to unlock <strong>Free Delivery</strong>.
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-xs text-green-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>🎉 Outstanding! You have unlocked <strong>Free Delivery</strong>.</span>
                  </div>
                )}

                <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm divide-y">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.product.id}-${item.selectedSize || ''}-${item.selectedType || ''}`}
                      className="py-6 first:pt-0 last:pb-0 flex gap-4"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-20 w-20 object-cover rounded-xl border border-zinc-100 shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-xs font-bold truncate pr-3 text-zinc-800">{item.product.name}</h3>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {item.selectedSize && (
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-brand-cream-dark text-brand-burgundy">
                                {item.selectedSize}
                              </span>
                            )}
                            {item.selectedType && (
                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                item.selectedType === 'Eggless' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                              }`}>
                                {item.selectedType === 'Eggless' ? 'Eggless' : 'Contains Egg'}
                              </span>
                            )}
                          </div>
                          
                          {item.cakeMessage && (
                            <p className="text-[10px] text-zinc-400 mt-1">
                              &ldquo;{item.cakeMessage}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-4">
                          {/* Qty selector */}
                          <div className="flex items-center rounded-full border border-zinc-200 bg-white">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1.5 hover:opacity-75"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-semibold px-2.5">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1.5 hover:opacity-75"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-zinc-800">
                              ₹{item.product.price * item.quantity}
                            </span>
                            {item.product.discount > 0 && (
                              <p className="text-[10px] text-zinc-400 line-through">
                                ₹{item.product.originalPrice * item.quantity}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Right Column: Pricing details */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-5">
                  <h3 className="text-xs font-serif font-extrabold text-zinc-800 uppercase tracking-wider pb-3 border-b border-zinc-100">
                    Pricing Summary
                  </h3>

                  {/* Promo Input */}
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-grow">
                      <Tag className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Promo code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        disabled={!!promoCode}
                        className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-brand-burgundy/40 disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!!promoCode}
                      className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-bold text-xs tracking-wider uppercase rounded-xl disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </form>

                  {promoCode && (
                    <div className="p-2.5 rounded bg-brand-burgundy/5 text-brand-burgundy text-[10px] font-semibold flex justify-between items-center">
                      <span>🎟️ Code: <strong>{promoCode}</strong> (-₹{discountAmount})</span>
                      <button onClick={removePromoCode} className="underline uppercase hover:opacity-75">
                        Remove
                      </button>
                    </div>
                  )}

                  {promoError && (
                    <div className="p-2 rounded bg-red-50 text-red-600 text-[10px] font-medium flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{promoError}</span>
                    </div>
                  )}

                  {/* Bill details */}
                  <div className="space-y-2 text-xs text-zinc-500">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-zinc-800">₹{subtotal}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Promo Discount</span>
                        <span>-₹{discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-medium text-zinc-800">
                        {deliveryFee === 0 ? <span className="text-green-600 font-bold uppercase text-[9px]">Free</span> : `₹${deliveryFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-zinc-800 border-t pt-3 mt-2">
                      <span>Grand Total</span>
                      <span className="text-base text-brand-burgundy">₹{total}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/checkout')}
                    className="w-full py-3.5 rounded-full bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow"
                  >
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
