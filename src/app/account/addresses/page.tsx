'use client';

import React, { useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';

export default function AccountAddressesPage() {
  const { savedAddresses, addAddress, removeAddress } = useAuth();
  const { showToast } = useToast();

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: '', mobile: '', house: '', street: '', area: '', city: '', pincode: '', landmark: ''
  });

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.name || !newAddr.mobile || !newAddr.house || !newAddr.street || !newAddr.area || !newAddr.city || !newAddr.pincode) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    addAddress(newAddr);
    showToast('Address added successfully!', 'success');
    setShowAddressForm(false);
    setNewAddr({ name: '', mobile: '', house: '', street: '', area: '', city: '', pincode: '', landmark: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-serif font-extrabold text-zinc-800">Saved Addresses</h3>
          <p className="text-xs text-zinc-500">Manage your shipping destination list.</p>
        </div>
        
        {!showAddressForm && (
          <button
            onClick={() => setShowAddressForm(true)}
            className="px-4 py-2 border border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/5 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add New
          </button>
        )}
      </div>

      {showAddressForm && (
        <form onSubmit={handleAddAddressSubmit} className="bg-zinc-50 border rounded-2xl p-5 space-y-4 text-xs">
          <h4 className="font-serif font-extrabold text-zinc-800 border-b pb-2">Add New Destination</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                onChange={(e) => setNewAddr({ ...newAddr, mobile: e.target.value })}
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
                onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
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

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAddressForm(false)}
              className="px-4 py-2 border rounded-lg hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-bold rounded-lg"
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
            className="border border-zinc-100 rounded-2xl p-4 flex justify-between items-start hover:border-brand-burgundy/10 transition-colors"
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
              className="text-zinc-300 hover:text-red-500 p-1.5 transition-colors"
              title="Remove address"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
