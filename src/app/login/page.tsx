'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Phone, CheckCircle2, UserCheck, KeyRound, Truck } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPhone } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10 || isNaN(Number(phone))) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      showToast('OTP sent! Use 1234 to log in.', 'info');
    }, 800);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '1234') {
      showToast('Invalid OTP. Please enter 1234 for simulation.', 'error');
      return;
    }

    setLoading(true);
    try {
      await loginWithPhone(phone);
      showToast('Logged in successfully!', 'success');
      router.push('/account');
    } catch (err) {
      showToast('Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setLoading(true);
    setTimeout(() => {
      showToast('Logged in as Guest Client.', 'success');
      router.push('/');
    }, 500);
  };

  const handleDeliveryPartnerLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const partner = { phone: '9999999999', name: 'FATAFAT Rider', email: 'rider@fatafat.com' };
      localStorage.setItem('fatafat_user', JSON.stringify(partner));
      showToast('Logged in as Delivery Partner.', 'success');
      router.push('/delivery-partner');
    }, 500);
  };

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-16 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full px-4">
          <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-serif font-extrabold text-[#1A1A1A]">
                Welcome to FATAFAT
              </h1>
              <p className="text-xs text-zinc-500">
                Sign in to manage orders, track deliveries, and save addresses.
              </p>
            </div>

            {step === 'phone' ? (
              /* Phone Input Form */
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="loginPhone" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-bold text-zinc-400">+91</span>
                    <input
                      type="tel"
                      id="loginPhone"
                      maxLength={10}
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-brand-burgundy/40 focus:ring-1 focus:ring-brand-burgundy"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-brand-burgundy hover:bg-brand-burgundy-dark disabled:bg-zinc-300 text-white font-serif font-bold text-xs tracking-wider uppercase transition-all shadow-md"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              /* OTP Input Form */
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="loginOtp" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Enter OTP (Use 1234)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="password"
                      id="loginOtp"
                      maxLength={4}
                      placeholder="Enter 4-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-brand-burgundy/40 focus:ring-1 focus:ring-brand-burgundy"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">Didn&apos;t receive code?</span>
                  <button type="button" onClick={() => setStep('phone')} className="text-brand-burgundy font-bold underline">
                    Change Mobile
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-brand-burgundy hover:bg-brand-burgundy-dark disabled:bg-zinc-300 text-white font-serif font-bold text-xs tracking-wider uppercase transition-all shadow-md"
                >
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-100"></div>
              <span className="flex-shrink mx-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-zinc-100"></div>
            </div>

            {/* Guest Login button */}
            <button
              onClick={handleGuestLogin}
              className="w-full py-3 rounded-full border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            >
              <UserCheck className="h-4 w-4 text-zinc-500" />
              Continue as Guest
            </button>

            {/* Delivery Partner Demo Login button */}
            <button
              onClick={handleDeliveryPartnerLogin}
              className="w-full py-3 rounded-full border border-brand-coral hover:bg-brand-blush text-brand-burgundy text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Truck className="h-4 w-4 text-brand-burgundy" />
              Delivery Partner Demo Login
            </button>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-[10px] text-zinc-500">
              <ShieldCheck className="h-4 w-4 text-brand-burgundy shrink-0" />
              <span>We do not share your contact details. OTP validation is secure.</span>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
