'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '../../../context/OrderContext';
import { useToast } from '../../../components/Toast';
import { ShoppingBag, Search, SlidersHorizontal, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { orders, updateOrderStatus } = useOrders();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const handleOrderChangeStatus = (orderId: string, status: any) => {
    updateOrderStatus(orderId, status);
    showToast(`Order #${orderId} status changed to ${status}!`, 'success');
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (selectedStatus !== 'All' && order.status !== selectedStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(q) ||
        order.address.name.toLowerCase().includes(q) ||
        order.items.some(it => it.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Page Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900">Orders Management</h3>
          <p className="text-xs text-zinc-500 font-medium">Verify live quick commerce shipments and adjust delivery tracking routes.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-zinc-200/20 p-5 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
        
        {/* Search */}
        <div className="space-y-1 md:col-span-2">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Search Orders</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Order ID, customer name, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy/40"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Status Filter</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 border rounded-xl bg-[#FAF9F6] focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Preparing">Preparing</option>
            <option value="Packed">Packed</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

      </div>

      {/* Grid listing */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border rounded-3xl bg-white shadow-sm flex flex-col items-center justify-center space-y-3">
          <ShoppingBag className="h-10 w-10 text-zinc-300" />
          <h4 className="font-serif font-extrabold text-zinc-800 text-sm">No orders found</h4>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Awaiting new customer purchases. Go add products to cart and complete checkout on the customer website.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/20 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none">
                <th className="p-3.5">Order ID</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Ordered Items</th>
                <th className="p-3.5">Paid Amount</th>
                <th className="p-3.5">Logistics Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-zinc-650">
              {filteredOrders.map((order) => {
                const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id} className="hover:bg-zinc-50/20 transition-all cursor-pointer" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                    <td className="p-3.5 font-bold text-brand-burgundy text-xs">
                      #VM{order.id.slice(0, 5).toUpperCase()}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-zinc-800">{order.address.name}</p>
                      <p className="text-[9px] text-zinc-400 font-bold">{order.address.mobile}</p>
                    </td>
                    <td className="p-3.5 truncate max-w-[250px] text-zinc-500 font-medium">
                      {order.items.map(it => `${it.name} x${it.quantity}`).join(', ')}
                    </td>
                    <td className="p-3.5 font-bold text-zinc-800">
                      ₹{order.total}
                    </td>
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleOrderChangeStatus(order.id, e.target.value)}
                          className="p-1.5 bg-[#FAF9F6] border rounded-xl outline-none font-bold text-zinc-700 focus:bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Packed">Packed</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="text-xs text-brand-burgundy font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        Details <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
