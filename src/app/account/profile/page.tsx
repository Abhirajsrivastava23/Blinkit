'use client';

import React from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">My Profile Details</h3>
        <p className="text-xs text-zinc-500">View and verify your registered client details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-2xl">
        <div className="space-y-1 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Full Name</span>
          <p className="font-extrabold text-zinc-800 text-sm">{user.name || 'Valued Client'}</p>
        </div>
        <div className="space-y-1 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Mobile Phone</span>
          <p className="font-extrabold text-zinc-800 text-sm">+91 {user.phone}</p>
        </div>
        <div className="space-y-1 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 md:col-span-2">
          <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">Email Address</span>
          <p className="font-extrabold text-zinc-800 text-sm">{user.email || 'client@fatafat.com'}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 max-w-2xl text-[10px] text-zinc-500">
        💡 Your data is handled in compliance with privacy guidelines. Support references are encrypted.
      </div>
    </div>
  );
}
