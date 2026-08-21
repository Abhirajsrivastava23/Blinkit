'use client';

import React, { useState } from 'react';
import { useToast } from '../../../components/Toast';

export default function AccountSettingsPage() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState({
    smsAlerts: true,
    emailAlerts: true,
    discreetDeliveryNote: true
  });

  const handleSave = () => {
    showToast('Account configurations saved successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Account Settings</h3>
        <p className="text-xs text-zinc-500">Configure alert notifications and celebration profiles.</p>
      </div>

      <div className="space-y-4 max-w-md text-xs">
        <div className="space-y-3 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
          <h4 className="font-bold text-zinc-700">Notification Alerts</h4>
          
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-200">
            <div>
              <p className="font-bold text-zinc-800">SMS Order Updates</p>
              <p className="text-[10px] text-zinc-400">Receive delivery ETA texts and status logs.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.smsAlerts}
              onChange={(e) => setSettings({ ...settings, smsAlerts: e.target.checked })}
              className="h-4 w-4 accent-brand-burgundy cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="font-bold text-zinc-800">Email Promotions</p>
              <p className="text-[10px] text-zinc-400">Receive coupons, new product announcements, and recipe articles.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
              className="h-4 w-4 accent-brand-burgundy cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-3 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
          <h4 className="font-bold text-zinc-700">Delivery Choices</h4>
          
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="font-bold text-zinc-800">Default Discreet Packaging</p>
              <p className="text-[10px] text-zinc-400">Automatically request unbranded boxes for all checkouts.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.discreetDeliveryNote}
              onChange={(e) => setSettings({ ...settings, discreetDeliveryNote: e.target.checked })}
              className="h-4 w-4 accent-brand-burgundy cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase rounded-xl shadow"
        >
          Save Settings
        </button>

      </div>
    </div>
  );
}
