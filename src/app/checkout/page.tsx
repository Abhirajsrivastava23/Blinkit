'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, CreditCard, ShoppingBag, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import { useAuth, Address } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { useToast } from '../../components/Toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, subtotal, deliveryFee, discountAmount, total, clearCart } = useCart();
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
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('NOT_STARTED');
  const [manualUpi, setManualUpi] = useState<{ paymentId: string; orderId: string; amount: number } | null>(null);
  const [upiDetails, setUpiDetails] = useState<{ upiId: string; amount: number; uri: string; merchantName: string; note: string } | null>(null);
  const [utr, setUtr] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isLoadingUpi, setIsLoadingUpi] = useState(false);
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
    if (cartItems.length === 0 && currentStep !== 5) {
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

  const handleCopyUpi = async () => {
    if (!upiDetails?.upiId) return;
    try {
      await navigator.clipboard.writeText(upiDetails.upiId);
      showToast('UPI ID copied to clipboard.', 'success');
    } catch {
      showToast('Unable to copy UPI ID automatically.', 'error');
    }
  };

  const handleManualUpiSubmit = async () => {
    if (!manualUpi) {
      showToast('No pending UPI payment found.', 'error');
      return;
    }

    if (!utr.trim()) {
      showToast('Please enter the UTR reference from your payment transfer.', 'error');
      return;
    }

    if (!proofFile) {
      showToast('Please upload a payment proof screenshot.', 'error');
      return;
    }

    try {
      setIsSubmittingProof(true);
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

      const submitRes = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: manualUpi.orderId,
          paymentId: manualUpi.paymentId,
          amount: manualUpi.amount,
          utr: utr.trim(),
          proofImageUrl: uploadData.url,
        }),
      });

      const submitData = await submitRes.json() as { success?: boolean; error?: string };
      if (!submitRes.ok || !submitData.success) {
        throw new Error(submitData.error || 'Could not submit payment proof');
      }

      const confirmedOrderId = manualUpi.orderId;
      setPaymentStatus('COMPLETED');
      setManualUpi(null);
      setUtr('');
      setProofFile(null);
      clearCart();
      showToast('Payment submitted successfully. Your payment is under review by our team.', 'success');
      router.push(`/order/${confirmedOrderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment proof submission failed.';
      showToast(message, 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handlePlaceOrder = async () => {
    const address = savedAddresses.find(a => a.id === selectedAddressId);
    if (!address) {
      showToast('Delivery address not selected.', 'error');
      setCurrentStep(1);
      return;
    }

    if (!paymentMethod) {
      showToast('Please select a payment method.', 'error');
      return;
    }

    if (!address.name || !address.mobile || !address.house || !address.street || !address.area || !address.city || !address.pincode) {
      showToast('Invalid delivery address. Please fill all address fields.', 'error');
      setCurrentStep(1);
      return;
    }

    if (paymentMethod !== 'UPI') {
      showToast('Manual UPI verification is the only active payment option.', 'info');
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
        { subtotal, deliveryFee, discount: discountAmount, total },
        paymentMethod,
        scheduledDeliveryAt || undefined
      );

      if (!order || !order.id) {
        throw new Error('Order creation did not return a valid order ID.');
      }

      // Mark order placed to prevent cart empty guard interference
      isOrderPlacedRef.current = true;

      const paymentRoute = `/order/${order.id}/payment`;
      console.log('ORDER CREATED:', order);
      console.log('ORDER ID:', order.id);
      console.log('PAYMENT ROUTE:', paymentRoute);
      console.log('NAVIGATION STARTED:', paymentRoute);

      showToast('Order created! Complete your UPI payment.', 'success');
      clearCart();
      router.replace(paymentRoute);
    } catch (err) {
      isOrderPlacedRef.current = false;
      setPaymentStatus('FAILED');
      const errorMsg = err instanceof Error ? err.message : 'Order creation failed. Please try again.';
      showToast(errorMsg, 'error');
      console.error('Payment error:', err);
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
                <span className={currentStep >= 4 ? 'text-brand-burgundy font-extrabold' : ''}>4. Review</span>
                <span className={currentStep >= 5 ? 'text-brand-burgundy font-extrabold' : ''}>5. Pay</span>
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
                      <h2 className="text-lg font-serif font-extrabold text-zinc-800">Online Payment Required</h2>
                      <p className="text-xs text-zinc-500">Complete online payment to confirm your order.</p>
                    </div>

                    <div className="p-4 bg-brand-burgundy/10 border border-brand-burgundy/30 rounded-2xl flex gap-3">
                      <div className="flex-shrink-0 text-brand-burgundy">
                        <CreditCard className="h-5 w-5 mt-0.5" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-brand-burgundy">Online Payment Only</p>
                        <p className="text-zinc-600 mt-1">Your order must be paid online to confirm. Cash on Delivery is not available. Choose a payment method below.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-4 rounded-2xl border text-xs cursor-pointer select-none transition-all flex items-center gap-3 ${
                          paymentMethod === 'UPI' ? 'border-brand-burgundy bg-brand-burgundy/[0.02]' : 'border-zinc-200 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_select"
                          checked={paymentMethod === 'UPI'}
                          onChange={() => setPaymentMethod('UPI')}
                          className="accent-brand-burgundy h-4 w-4"
                        />
                        <div>
                          <h4 className="font-bold text-zinc-800">Manual UPI Verification</h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Only active online payment option. Admin verifies before order confirmation.</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 opacity-70">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-zinc-600">Cash on Delivery</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">COMING SOON</p>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-200 px-2 py-1 rounded-full">Disabled</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 opacity-70">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-zinc-600">Credit / Debit Card</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">COMING SOON</p>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-200 px-2 py-1 rounded-full">Disabled</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 opacity-70">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-zinc-600">Net Banking</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">COMING SOON</p>
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
                        <p className="text-zinc-700 font-bold uppercase">
                          {paymentMethod === 'NetBanking' ? 'Net Banking' : paymentMethod}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {paymentMethod === 'UPI'
                            ? 'Manual UPI verification is active. Order confirmation occurs after admin approval.'
                            : 'Payment required to confirm order'}
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {/* STEP 5: UPI PAYMENT & PROOF SUBMISSION */}
                {currentStep === 5 && upiDetails && (
                  <div className="space-y-6">
                    <div className="border-b pb-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-burgundy">Secure Payment</span>
                      <h2 className="text-xl font-serif font-extrabold text-zinc-900 mt-1">PAY SECURELY VIA UPI</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">Amount to Pay: <strong className="text-zinc-900 font-extrabold text-sm">₹{upiDetails.amount}</strong> (Order #{manualUpi?.orderId})</p>
                    </div>

                    {/* UPI QR Code Card */}
                    <div className="rounded-3xl border border-brand-burgundy/20 bg-gradient-to-br from-brand-burgundy/[0.05] to-brand-burgundy/[0.02] p-6 sm:p-8 space-y-6">
                      
                      {/* QR Code Display */}
                      <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-burgundy bg-[#FFF0EE] px-3 py-1 rounded-full">
                          Scan to Pay ₹{upiDetails.amount}
                        </span>
                        <div className="border-4 border-white rounded-2xl shadow-xl overflow-hidden p-2 bg-white">
                          <QRCodeSVG 
                            value={upiDetails.uri} 
                            size={240} 
                            level="H" 
                            includeMargin={true}
                          />
                        </div>
                        <p className="text-xs text-zinc-600 text-center font-medium">
                          Scan the QR using any UPI app (GPay, PhonePe, Paytm, BHIM) and pay the exact amount.
                        </p>
                      </div>

                      {/* UPI ID Display */}
                      <div className="space-y-3 p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">FATAFAT Merchant UPI ID</p>
                          <h4 className="mt-1 text-xl sm:text-2xl font-serif font-black text-brand-burgundy tracking-wide select-all">{upiDetails.upiId}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 rounded-xl bg-white text-zinc-700 hover:bg-zinc-50 active:scale-98 transition-all text-center"
                          >
                            Copy UPI ID
                          </button>
                          <a
                            href={upiDetails.uri}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider bg-brand-burgundy text-white rounded-xl text-center hover:bg-[#541424] active:scale-98 transition-all flex items-center justify-center shadow-sm"
                          >
                            Pay via UPI App
                          </a>
                        </div>
                      </div>

                      {/* Payment Instructions */}
                      <div className="space-y-2 p-5 bg-white rounded-2xl border border-zinc-100 text-xs text-zinc-700">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">Payment Steps</h4>
                        <ol className="space-y-1.5 list-decimal list-inside text-zinc-600 font-medium">
                          <li>Open any UPI app and scan the QR code above or enter UPI ID <strong className="text-zinc-900">{upiDetails.upiId}</strong>.</li>
                          <li>Confirm exact amount: <strong className="text-zinc-900">₹{upiDetails.amount}</strong>.</li>
                          <li>Complete the transfer and take a screenshot of the payment receipt.</li>
                          <li>Enter your 12-digit UTR below and attach your screenshot.</li>
                        </ol>
                      </div>

                      {/* Payment Details Summary */}
                      <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-2xl border border-zinc-100">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Order Amount</p>
                          <p className="mt-1 text-lg font-bold text-brand-burgundy">₹{upiDetails.amount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Payment Status</p>
                          <p className="mt-1 text-sm font-bold text-zinc-600">Awaiting Verification</p>
                        </div>
                      </div>

                    </div>

                    {/* Proof Submission Section */}
                    <div className="rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800">Submit Payment Proof</h4>
                        <p className="text-xs text-zinc-500 mt-1">After making the payment, provide the details below for admin verification.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">UTR / Transaction Reference *</label>
                          <input
                            type="text"
                            value={utr}
                            onChange={(e) => setUtr(e.target.value)}
                            placeholder="e.g., 202609011234567890"
                            className="w-full border border-zinc-200 rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20"
                          />
                          <p className="text-[9px] text-zinc-400">You can find this in your UPI app payment confirmation</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Payment Proof Screenshot *</label>
                          <div className="border-2 border-dashed border-zinc-300 rounded-xl p-4 bg-white hover:bg-zinc-50 transition-colors cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                setProofFile(file || null);
                              }}
                              className="w-full cursor-pointer text-xs"
                            />
                            {proofFile && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-semibold">
                                <Check className="h-4 w-4" /> {proofFile.name}
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-400 mt-1">PNG, JPEG, or WebP. Max 5MB. Show UTR in screenshot.</p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleManualUpiSubmit}
                        disabled={isSubmittingProof || !utr.trim() || !proofFile}
                        className="w-full bg-brand-burgundy text-white font-bold rounded-xl px-4 py-4 text-xs uppercase tracking-wider hover:bg-brand-burgundy-dark active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-burgundy/10"
                      >
                        {isSubmittingProof ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⌛</span> Submitting Proof...
                          </span>
                        ) : (
                          'Submit Proof for Verification'
                        )}
                      </button>
                    </div>

                    {/* Admin Verification Info */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                      <p className="text-xs text-blue-900 leading-relaxed">
                        <strong>ℹ️ What happens next?</strong> Your payment proof will be reviewed by our admin team within a few hours. You'll receive a notification once your payment is verified and your order is confirmed. Until then, your order status remains "Payment Verification Pending".
                      </p>
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
