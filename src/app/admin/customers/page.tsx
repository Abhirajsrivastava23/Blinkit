'use client';

import React from 'react';

export default function AdminCustomersPage() {
  const mockCustomers = [
    { name: 'Aarav Mehta', email: 'aarav@gmail.com', phone: '+91 9876543210', ordersCount: 4 },
    { name: 'Priya Sharma', email: 'priya@outlook.com', phone: '+91 9123456789', ordersCount: 2 },
    { name: 'Kunal Kapoor', email: 'kunal@yahoo.com', phone: '+91 9988776655', ordersCount: 1 }
  ];

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Customers Registry</h3>
        <p className="text-xs text-zinc-500 font-medium">Browse active client records.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-zinc-400 uppercase tracking-wider font-semibold">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Phone</th>
              <th className="py-2 text-center">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockCustomers.map((cust, i) => (
              <tr key={i}>
                <td className="py-2.5 font-bold text-zinc-700">{cust.name}</td>
                <td className="py-2.5 text-zinc-500">{cust.email}</td>
                <td className="py-2.5 text-zinc-500">{cust.phone}</td>
                <td className="py-2.5 text-center font-bold text-zinc-800">{cust.ordersCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
