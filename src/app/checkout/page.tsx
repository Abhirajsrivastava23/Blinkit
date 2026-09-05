'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, CreditCard, ShoppingBag, ArrowRight, ArrowLeft, Check, Lock, ShieldCheck, Zap } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import { useAuth, Address } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { useToast } from '../../components/Toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, subtotal, deliveryFee, discountAmount, promoCode, total, clearCart } = useCart();
  const { savedAddresses, addAddress, isLoggedIn, isLoading } = useAuth();
  const { placeOrder } = useOrders();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Step 1: Address states
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<Omit<Address, 'id'>>({
    name: '', mobile: '', house: '', street: '', area: '', city: '', pincode: '', landmark: ''
  });

  // Step 2: Schedule states
  const [deliveryOption, setDeliveryOption] = useState<'ASAP' | 'Scheduled'>('ASAP');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('06:00 PM - 08:00 PM');

  // Step 3: Payment states
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay' | 'UPI' | 'Card' | 'NetBanking'>('Razorpay');
  const [paymentStatus, setPaymentStatus] = useState<'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('NOT_STARTED');
  const isOrderPlacedRef = React.useRef(false);

  // Redirect if not logged in or cart is empty
  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      showToast('Please sign in to proceed to checkout.', 'error');
      router.push('/login?callback=/checkout');
      return;
    }
    if (isOrderPlacedRef.current) {
      return;
    }
    if (cartItems.length === 0) {
      showToast('Your cart is empty. Add products to checkout.', 'info');
      router.push('/');
      return;
    }
    if (savedAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }, [isLoading, isLoggedIn, cartItems.length, savedAddresses, router]);

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (showNewAddressForm) {
        // Validate and save new address
        if (!addressForm.name || !addressForm.mobile || !addressForm.house || !addressForm.street || !addressForm.area || !addressForm.city || !addressForm.pincode) {
          showToast('Please fill out all required address fields.', 'error');
          return;
        }
        addAddress(addressForm);
        showToast('Address saved successfully!', 'success');
        setShowNewAddressForm(false);
        // Focus the newly saved address
        return;
      }
      
      if (!selectedAddressId && savedAddresses.length === 0) {
        showToast('Please add a delivery address to proceed.', 'error');
        return;
      }
    }
    
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handlePlaceOrder = async () => {
    const address = savedAddresses.find(a => a.id === selectedAddressId);
    if (!address) {
      showToast('Delivery address not selected.', 'error');
      setCurrentStep(1);
      return;
    }

    if (!address.name || !address.mobile || !address.house || !address.street || !address.area || !address.city || !address.pincode) {
      showToast('Invalid delivery address. Please fill all address fields.', 'error');
      setCurrentStep(1);
      return;
    }

    setPaymentStatus('PROCESSING');

    try {
      const orderItems = cartItems.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
        category: item.product.category,
        selectedSize: item.selectedSize,
        selectedType: item.selectedType
      }));

      let scheduledDeliveryAt = null;
      if (deliveryOption === 'Scheduled') {
        const slotStart = selectedTimeSlot.split(' - ')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [time, period] = slotStart.split(' ');
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        tomorrow.setHours(hour, parseInt(minutes), 0, 0);
        scheduledDeliveryAt = tomorrow.toISOString();
      }

      // 1. Create order on server FIRST and await response
      const order = await placeOrder(
        orderItems,
        address,
        deliveryOption,
        deliveryOption === 'Scheduled' ? selectedTimeSlot : 'ASAP',
        { subtotal, deliveryFee, discount: discountAmount, total, couponCode: promoCode || undefined } as any,
        'Razorpay',
        scheduledDeliveryAt || undefined
      );

      if (!order || !order.id) {
        throw new Error('Order creation did not return a valid order ID.');
      }

      // Mark order placed to prevent cart empty guard interference
      isOrderPlacedRef.current = true;

      const paymentRoute = `/order/${order.id}/payment`;
      showToast('Order created! Opening secure payment...', 'success');
      clearCart();
      router.replace(paymentRoute);
    } catch (err) {
      isOrderPlacedRef.current = false;
      setPaymentStatus('FAILED');
      const errorMsg = err instanceof Error ? err.message : 'Order creation failed. Please try again.';
      showToast(errorMsg, 'error');
      console.error('Checkout error:', err);
    }
  };

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Multi-step forms */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Stepper Header indicator */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <span className={currentStep >= 1 ? 'text-brand-burgundy font-extrabold' : ''}>1. Address</span>
                <span className={currentStep >= 2 ? 'text-brand-burgundy font-extrabold' : ''}>2. Schedule</span>
                <span className={currentStep >= 3 ? 'text-brand-burgundy font-extrabold' : ''}>3. Payment</span>
                <span className={currentStep >= 4 ? 'text-brand-burgundy font-extrabold' : ''}>4. Review & Pay</span>
              </div>

              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                
                {/* STEP 1: ADDRESS SELECTION */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-serif font-extrabold text-zinc-800">Delivery Address</h2>
                      <p className="text-xs text-zinc-500">Select where we should deliver your celebration products.</p>
                    </div>

                    {/* Saved address grid */}
                    {!showNewAddressForm && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {savedAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`p-4 rounded-2xl border text-xs cursor-pointer select-none transition-all ${
                                selectedAddressId === addr.id
                                  ? 'border-brand-burgundy bg-brand-burgundy/[0.02]'
                                  : 'border-zinc-200 bg-white hover:border-brand-burgundy/20'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  name="selected_address"
                                  checked={selectedAddressId === addr.id}
                                  onChange={() => setSelectedAddressId(addr.id)}
                                  className="accent-brand-burgundy h-4 w-4"
                                />
                                <span className="font-bold text-zinc-800">{addr.name}</span>
                              </div>
                              <p className="text-[10px] text-zinc-400">Mobile: +91 {addr.mobile}</p>
                              <p className="text-zinc-600 mt-1 leading-relaxed">
                                {addr.house}, {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                              </p>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setShowNewAddressForm(true)}
                          className="px-5 py-2.5 border border-dashed border-zinc-300 hover:border-brand-burgundy hover:text-brand-burgundy text-xs font-bold uppercase tracking-wider rounded-2xl w-full text-center transition-colors"
                        >
                          + Add a New Delivery Address
                        </button>
                      </div>
                    )}

                    {/* Add new address inline form */}
                    {showNewAddressForm && (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">Receiver Name *</label>
                            <input
                              type="text"
                              required
                              value={addressForm.name}
                              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">Mobile Phone *</label>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              value={addressForm.mobile}
                              onChange={(e) => setAddressForm({ ...addressForm, mobile: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">House/Flat/Office *</label>
                            <input
                              type="text"
                              required
                              value={addressForm.house}
                              onChange={(e) => setAddressForm({ ...addressForm, house: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">Street Name *</label>
                            <input
                              type="text"
                              required
                              value={addressForm.street}
                              onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">Area/Locality *</label>
                            <input
                              type="text"
                              required
                              value={addressForm.area}
                              onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">City *</label>
                            <input
                              type="text"
                              required
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">Pincode *</label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={addressForm.pincode}
                              onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-zinc-500">Landmark (Optional)</label>
                            <input
                              type="text"
                              value={addressForm.landmark}
                              onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                              className="w-full p-2 border rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setShowNewAddressForm(false)}
                            className="px-4 py-2 border rounded-lg hover:bg-zinc-50 font-semibold"
                          >
                            Go Back
                          </button>
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="px-5 py-2 bg-brand-burgundy text-white font-bold rounded-lg hover:bg-brand-burgundy-dark"
                          >
                            Save & Proceed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: DELIVERY SCHEDULING */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-serif font-extrabold text-zinc-800">Delivery Schedule</h2>
                      <p className="text-xs text-zinc-500">Choose when we should deliver your order.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        onClick={() => setDeliveryOption('ASAP')}
                        className={`p-5 rounded-2xl border text-xs cursor-pointer select-none transition-all flex items-start gap-3 ${
                          deliveryOption === 'ASAP'
                            ? 'border-brand-burgundy bg-brand-burgundy/[0.02]'
                            : 'border-zinc-200 bg-white hover:border-brand-burgundy/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery_option"
                          checked={deliveryOption === 'ASAP'}
                          onChange={() => setDeliveryOption('ASAP')}
                          className="accent-brand-burgundy h-4 w-4 mt-0.5"
                        />
                        <div>
                          <h4 className="font-bold text-zinc-800 text-sm">Deliver ASAP (Quick Commerce)</h4>
                          <p className="text-zinc-500 mt-1 leading-relaxed">
                            Our runner will carry and deliver your products immediately. Est. delivery time: Within 12 hours.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => setDeliveryOption('Scheduled')}
                        className={`p-5 rounded-2xl border text-xs cursor-pointer select-none transition-all flex items-start gap-3 ${
                          deliveryOption === 'Scheduled'
                            ? 'border-brand-burgundy bg-brand-burgundy/[0.02]'
                            : 'border-zinc-200 bg-white hover:border-brand-burgundy/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery_option"
                          checked={deliveryOption === 'Scheduled'}
                          onChange={() => setDeliveryOption('Scheduled')}
                          className="accent-brand-burgundy h-4 w-4 mt-0.5"
                        />
                        <div>
                          <h4 className="font-bold text-zinc-800 text-sm">Schedule for Later</h4>
                          <p className="text-zinc-500 mt-1 leading-relaxed">
                            Book a specific delivery slot (e.g. for midnight surprises or birthday party preparation).
                          </p>
                        </div>
                      </div>
                    </div>

                    {deliveryOption === 'Scheduled' && (
                      <div className="space-y-2 max-w-sm pt-2">
                        <label className="text-xs font-bold text-zinc-500">Available Time Slots</label>
                        <select
                          value={selectedTimeSlot}
                          onChange={(e) => setSelectedTimeSlot(e.target.value)}
                          className="w-full p-2.5 border rounded-xl text-xs bg-white focus:outline-none"
                        >
                          <option value="10:00 AM - 12:00 PM">Morning (10:00 AM - 12:00 PM)</option>
                          <option value="12:00 PM - 02:00 PM">Afternoon (12:00 PM - 02:00 PM)</option>
                          <option value="02:00 PM - 04:00 PM">Late Afternoon (02:00 PM - 04:00 PM)</option>
                          <option value="06:00 PM - 08:00 PM">Evening (06:00 PM - 08:00 PM)</option>
                          <option value="09:00 PM - 11:59 PM">Midnight Special (09:00 PM - 11:59 PM)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: ONLINE PAYMENT */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-serif font-extrabold text-zinc-800">Online Payment Method</h2>
                      <p className="text-xs text-zinc-500">Pay securely using UPI, Debit/Credit Cards, NetBanking, or Wallets.</p>
                    </div>

                    <div className="p-4 bg-brand-burgundy/10 border border-brand-burgundy/30 rounded-2xl flex gap-3">
                      <div className="flex-shrink-0 text-brand-burgundy">
                        <ShieldCheck className="h-5 w-5 mt-0.5 text-emerald-600" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-brand-burgundy">Razorpay 256-Bit Encrypted Checkout</p>
                        <p className="text-zinc-600 mt-1">Transactions are protected with instant confirmation. All major payment options supported.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div
                        onClick={() => setPaymentMethod('Razorpay')}
                        className={`p-5 rounded-2xl border text-xs cursor-pointer select-none transition-all flex items-center justify-between gap-3 border-brand-burgundy bg-brand-burgundy/[0.02] shadow-xs`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_select"
                            checked={true}
                            onChange={() => setPaymentMethod('Razorpay')}
                            className="accent-brand-burgundy h-4 w-4"
                          />
                          <div>
                            <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                              <span>Razorpay Secure Gateway</span>
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">INSTANT</span>
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">UPI (GPay, PhonePe, Paytm), Cards (Visa, Mastercard, RuPay), NetBanking & Wallets</p>
                          </div>
                        </div>
                        <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
                      </div>

                      <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 opacity-60">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-zinc-600">Cash on Delivery</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">COMING SOON (Disabled for quick perishable commerce)</p>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-200 px-2 py-1 rounded-full">Disabled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: ORDER REVIEW */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-serif font-extrabold text-zinc-800">Review & Place Order</h2>
                      <p className="text-xs text-zinc-500">Double check order options, price logs, and address details.</p>
                    </div>

                    <div className="space-y-4 text-xs leading-relaxed">
                      
                      {/* Address summary */}
                      <div className="p-4 bg-zinc-50 rounded-2xl border">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 mb-1">Shipping Destination</h4>
                        {(() => {
                          const addr = savedAddresses.find((a) => a.id === selectedAddressId);
                          return addr ? (
                            <p className="text-zinc-700">
                              <strong>{addr.name}</strong> • +91 {addr.mobile} <br />
                              {addr.house}, {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                            </p>
                          ) : (
                            <p className="text-red-500">Address not selected.</p>
                          );
                        })()}
                      </div>

                      {/* Schedule summary */}
                      <div className="p-4 bg-zinc-50 rounded-2xl border">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 mb-1">Delivery Time Slot</h4>
                        <p className="text-zinc-700">
                          {deliveryOption === 'ASAP' 
                            ? 'Deliver ASAP (Within 12 hours)' 
                            : `Scheduled delivery for slot: ${selectedTimeSlot}`}
                        </p>
                      </div>

                      {/* Payment summary */}
                      <div className="p-4 bg-zinc-50 rounded-2xl border">
                        <h4 className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 mb-1">Payment Method</h4>
                        <p className="text-zinc-700 font-bold uppercase flex items-center gap-1.5">
                          <span>Razorpay Secure Checkout</span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">256-Bit SSL</span>
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          You will be directed to complete secure payment via Razorpay.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                {!showNewAddressForm && (
                  <div className="flex gap-4 pt-6 border-t border-zinc-100 justify-between">
                    {currentStep > 1 ? (
                      <button
                        onClick={handlePrevStep}
                        className="px-6 py-2.5 border rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 flex items-center gap-1"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                    ) : (
                      <div /> // dummy push
                    )}

                    {currentStep < 4 ? (
                      <button
                        onClick={handleNextStep}
                        className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs tracking-wider uppercase rounded-full flex items-center gap-1 shadow-md shadow-brand-burgundy/10"
                      >
                        Continue <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : currentStep === 4 ? (
                      <button
                        onClick={handlePlaceOrder}
                        className="px-8 py-3.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs tracking-wider uppercase rounded-full shadow-lg shadow-brand-burgundy/20 flex items-center gap-2"
                      >
                        <span>Proceed to Payment (₹{total})</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: Pricing & Cart Summary */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-serif font-bold tracking-wide border-b pb-3 border-zinc-100 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-brand-burgundy" /> Order Summary
                </h3>

                <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto dark-scroll pr-1">
                  {cartItems.map((item) => (
                    <div key={`${item.product.id}-${item.selectedSize || ''}`} className="py-3 flex justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate text-zinc-800">{item.product.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          Qty: {item.quantity} {item.selectedSize && `• Size: ${item.selectedSize}`} {item.selectedType && `• ${item.selectedType}`}
                        </p>
                      </div>
                      <span className="font-semibold text-zinc-700">₹{item.product.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 text-xs text-zinc-500">
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
                    <span>Delivery Charge</span>
                    <span className="font-medium text-zinc-800">
                      {deliveryFee === 0 ? <span className="text-green-600 font-bold uppercase text-[9px]">Free</span> : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-800 border-t pt-3 mt-2">
                    <span>Grand Total</span>
                    <span className="text-base text-brand-burgundy">₹{total}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border text-[10px] text-zinc-400 leading-relaxed">
                  🔐 Safe payments. We support encrypted transaction guidelines.
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
