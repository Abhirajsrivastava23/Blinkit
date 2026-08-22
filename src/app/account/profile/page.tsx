'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { User, Phone, Mail, Calendar, UserCheck, MapPin, Plus, Trash2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile, savedAddresses, addAddress, removeAddress } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: '', mobile: '', house: '', street: '', area: '', city: '', pincode: '', landmark: ''
  });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setDob(user.dob || '');
      setGender(user.gender || '');
    }
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return;
    }

    setIsSaving(true);
    const success = await updateProfile({ name, phone, dob, gender });
    setIsSaving(false);

    if (success) {
      showToast('Profile updated successfully!', 'success');
    } else {
      showToast('Failed to update profile.', 'error');
    }
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.name || !newAddr.mobile || !newAddr.house || !newAddr.street || !newAddr.area || !newAddr.city || !newAddr.pincode) {
      showToast('Please fill in all required address fields.', 'error');
      return;
    }
    addAddress(newAddr);
    showToast('New address added!', 'success');
    setShowAddressForm(false);
    setNewAddr({ name: '', mobile: '', house: '', street: '', area: '', city: '', pincode: '', landmark: '' });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header Info */}
      <div>
        <h3 className="text-xl font-serif font-extrabold text-zinc-800">My Profile Details</h3>
        <p className="text-xs text-zinc-500">Manage your personal settings, contact information, and shipping list.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Personal Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-5 text-xs">
            <h4 className="text-sm font-serif font-extrabold text-zinc-800 border-b pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-brand-burgundy" /> Personal Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 pl-8 border rounded-xl bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-burgundy"
                  />
                  <User className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Mobile Phone *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-zinc-400 font-bold">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 pl-11 border rounded-xl bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-burgundy"
                  />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="font-bold text-zinc-500">Email Address (Primary Identity)</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={user.email || ''}
                    className="w-full p-2.5 pl-8 border rounded-xl bg-zinc-50 text-zinc-400 cursor-not-allowed border-zinc-100"
                  />
                  <Mail className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
                <p className="text-[10px] text-zinc-400 italic mt-1">
                  ℹ️ Email addresses are tied to your authentication system and cannot be changed by the customer.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Date of Birth</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2.5 pl-8 border rounded-xl bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-burgundy"
                  />
                  <Calendar className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Gender</label>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 pl-8 border rounded-xl bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-burgundy appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  <UserCheck className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark disabled:bg-zinc-300 font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>

          {/* Address Management Area */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-5 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="text-sm font-serif font-extrabold text-zinc-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-burgundy" /> Saved Addresses
              </h4>
              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="px-3 py-1.5 border border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/5 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New
                </button>
              )}
            </div>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="bg-zinc-50 border rounded-2xl p-4 space-y-4">
                <h5 className="font-serif font-extrabold text-zinc-800 border-b pb-1.5">New shipping address</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Receiver Name *</label>
                    <input
                      type="text"
                      required
                      value={newAddr.name}
                      onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={newAddr.mobile}
                      onChange={(e) => setNewAddr({ ...newAddr, mobile: e.target.value.replace(/\D/g, '') })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">House/Flat Number *</label>
                    <input
                      type="text"
                      required
                      value={newAddr.house}
                      onChange={(e) => setNewAddr({ ...newAddr, house: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Street Name *</label>
                    <input
                      type="text"
                      required
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Area/Locality *</label>
                    <input
                      type="text"
                      required
                      value={newAddr.area}
                      onChange={(e) => setNewAddr({ ...newAddr, area: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">City *</label>
                    <input
                      type="text"
                      required
                      value={newAddr.city}
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={newAddr.pincode}
                      onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value.replace(/\D/g, '') })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={newAddr.landmark}
                      onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-zinc-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-bold rounded-lg cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className="border border-zinc-100 rounded-2xl p-4 flex justify-between items-start hover:border-brand-burgundy/10 transition-colors bg-zinc-50/50"
                >
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-zinc-800">{addr.name}</p>
                    <p className="text-[10px] text-zinc-400">Mobile: +91 {addr.mobile}</p>
                    <p className="text-zinc-600 leading-relaxed mt-1">
                      {addr.house}, {addr.street}, <br />
                      {addr.area}, {addr.city} - {addr.pincode}
                    </p>
                    {addr.landmark && (
                      <p className="text-[10px] text-[#7A6010] bg-brand-gold/10 px-2 py-0.5 rounded inline-block mt-1.5">
                        📍 Landmark: {addr.landmark}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      removeAddress(addr.id);
                      showToast('Address removed.', 'info');
                    }}
                    className="text-zinc-300 hover:text-red-500 p-1.5 transition-colors cursor-pointer"
                    title="Remove address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {savedAddresses.length === 0 && (
                <p className="text-zinc-400 italic text-[11px] py-4 col-span-2 text-center">
                  No addresses saved yet. Add a destination above to speed up checkouts.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Privacy Card */}
        <div className="space-y-6">
          <div className="bg-[#FAF9F6] border border-zinc-100 rounded-3xl p-6 space-y-4 text-xs">
            <h5 className="font-serif font-extrabold text-zinc-800 text-sm">Security & Privacy Info</h5>
            <p className="text-zinc-600 leading-relaxed">
              Your registered mobile number and profile details are encrypted during transport and only accessible to you.
            </p>
            <p className="text-zinc-600 leading-relaxed">
              Your primary Google OAuth identifier is locked to prevent identity spoofing or unauthorized takeovers.
            </p>
            <div className="p-3 bg-zinc-50 border rounded-2xl text-[10px] text-zinc-500">
              💡 Need to change your primary account email? Please raise a support ticket or contact our Admin Operations desk directly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
