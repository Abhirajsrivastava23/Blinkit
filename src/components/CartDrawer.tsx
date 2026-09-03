'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, Plus, Minus, Trash2, Tag, ArrowRight, AlertCircle, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import SafeImage from './SafeImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [isApplying, setIsApplying] = useState(false);
  const isWellness = pathname.startsWith('/wellness');

  if (!isOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim() && !isApplying) {
      setIsApplying(true);
      const success = await applyPromoCode(couponInput);
      setIsApplying(false);
      if (success) {
        setCouponInput('');
      }
    }
  };

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className={`w-screen max-w-md flex flex-col shadow-2xl ${
          isWellness ? 'bg-wellness-dark text-wellness-text' : 'bg-white text-zinc-800'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-5 border-b ${
            isWellness ? 'border-wellness-bronze/20' : 'border-zinc-100'
          }`}>
            <div className="flex items-center gap-2">
              <ShoppingCart className={`h-5 w-5 ${isWellness ? 'text-wellness-bronze' : 'text-brand-burgundy'}`} />
              <h2 className="text-lg font-serif font-bold tracking-wide">My Cart</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isWellness ? 'bg-wellness-card text-wellness-bronze-light' : 'bg-brand-cream-dark text-brand-burgundy'
              }`}>
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors ${
                isWellness ? 'hover:bg-wellness-card text-wellness-text' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 dark-scroll">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`p-4 rounded-full mb-4 ${
                  isWellness ? 'bg-wellness-card text-wellness-bronze' : 'bg-brand-cream-dark text-brand-burgundy'
                }`}>
                  <ShoppingCart className="h-10 w-10" />
                </div>
                <h3 className="text-base font-bold font-serif">Your cart is empty</h3>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  Add sweet treats, beautiful blossoms, or thoughtful hampers to make your moments magical.
                </p>
                <button
                  onClick={onClose}
                  className={`mt-6 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md ${
                    isWellness
                      ? 'bg-wellness-bronze hover:bg-wellness-bronze-dark text-white'
                      : 'bg-brand-burgundy hover:bg-brand-burgundy-dark text-white'
                  }`}
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Free Delivery Promo Bar */}
                {amountToFreeDelivery > 0 ? (
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    isWellness 
                      ? 'bg-wellness-card/50 border-wellness-bronze/20 text-wellness-bronze-light' 
                      : 'bg-brand-burgundy/5 border-brand-burgundy/10 text-brand-burgundy'
                  }`}>
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Add <strong>₹{amountToFreeDelivery}</strong> more to unlock <strong>free delivery</strong>.
                    </span>
                  </div>
                ) : (
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    isWellness
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  }`}>
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>🎉 Congratulations! You have unlocked <strong>Free Delivery</strong>.</span>
                  </div>
                )}

                {/* Items List */}
                <div className="divide-y divide-zinc-100 divide-opacity-10">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.product.id}-${item.selectedSize || ''}-${item.selectedType || ''}`}
                      className="py-4 flex gap-4"
                    >
                      <SafeImage
                        src={item.product.image}
                        alt={item.product.name}
                        category={item.product.category}
                        className="h-16 w-16 object-cover rounded-lg shrink-0 border border-zinc-200 border-opacity-10"
                      />
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold truncate pr-2">{item.product.name}</h4>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          {/* Selected Custom Options */}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.selectedSize && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                isWellness ? 'bg-wellness-card text-wellness-bronze-light' : 'bg-brand-cream-dark text-brand-burgundy'
                              }`}>
                                {item.selectedSize}
                              </span>
                            )}
                            {item.selectedType && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                item.selectedType === 'Eggless' 
                                  ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
                              }`}>
                                {item.selectedType}
                              </span>
                            )}
                          </div>
                          
                          {item.cakeMessage && (
                            <p className="text-[9px] text-zinc-400 truncate mt-1">
                              &ldquo;{item.cakeMessage}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          {/* Quantity selector */}
                          <div className={`flex items-center rounded-full border ${
                            isWellness ? 'border-wellness-bronze/35 bg-wellness-black' : 'border-zinc-200 bg-white'
                          }`}>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1.5 hover:opacity-75"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-semibold px-2">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1.5 hover:opacity-75"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-bold">
                              ₹{item.product.price * item.quantity}
                            </span>
                            {item.product.discount > 0 && (
                              <p className="text-[9px] text-zinc-400 line-through">
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
            )}
          </div>

          {/* Footer Panel */}
          {cartItems.length > 0 && (
            <div className={`p-6 border-t space-y-4 ${
              isWellness ? 'border-wellness-bronze/25 bg-wellness-black' : 'border-zinc-100 bg-[#FAF9F6]'
            }`}>
              
              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className={`absolute left-3 top-2.5 h-3.5 w-3.5 ${isWellness ? 'text-wellness-bronze' : 'text-zinc-400'}`} />
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    disabled={!!promoCode}
                    className={`w-full h-9 pl-9 pr-4 rounded-lg text-xs outline-none border transition-all ${
                      isWellness
                        ? 'bg-wellness-dark border-wellness-bronze/35 text-wellness-text placeholder-wellness-muted focus:border-wellness-bronze'
                        : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-brand-burgundy/40'
                    } disabled:opacity-50`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!!promoCode || isApplying}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isWellness
                      ? 'bg-wellness-bronze hover:bg-wellness-bronze-dark text-white'
                      : 'bg-brand-burgundy hover:bg-brand-burgundy-dark text-white'
                  } disabled:opacity-50`}
                >
                  {isApplying ? 'Applying...' : 'Apply'}
                </button>
              </form>

              {/* Promo alerts */}
              {promoCode && (
                <div className={`p-2 rounded flex justify-between items-center text-[10px] font-semibold ${
                  isWellness ? 'bg-wellness-card text-wellness-bronze-light' : 'bg-brand-burgundy/5 text-brand-burgundy'
                }`}>
                  <span>🎟️ Coupon Applied (-₹{discountAmount})</span>
                  <button onClick={removePromoCode} className="text-[9px] underline uppercase tracking-wider hover:opacity-80">
                    Remove
                  </button>
                </div>
              )}

              {promoError && (
                <div className="p-2 rounded bg-red-500/10 text-red-500 text-[10px] font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}

              {/* Bill Details */}
              <div className="space-y-1.5 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-current">₹{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-current">
                    {deliveryFee === 0 ? <span className="text-green-600 font-bold uppercase text-[10px]">Free</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className={`flex justify-between text-sm font-bold pt-2 border-t mt-1.5 ${
                  isWellness ? 'border-wellness-bronze/20 text-wellness-text' : 'border-zinc-200 text-[#1A1A1A]'
                }`}>
                  <span>Grand Total</span>
                  <span className="text-base text-current">₹{total}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className={`w-full py-3 rounded-full font-serif font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md group ${
                  isWellness
                    ? 'bg-wellness-bronze hover:bg-wellness-bronze-dark text-white'
                    : 'bg-brand-burgundy hover:bg-brand-burgundy-dark text-white'
                }`}
              >
                Proceed to Checkout
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
