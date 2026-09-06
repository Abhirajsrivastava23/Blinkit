'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '../../../context/OrderContext';
import { useToast } from '../../../components/Toast';
import { 
  ShoppingBag, 
  Search, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  CreditCard,
  Truck
} from 'lucide-react';

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
        (order.address?.name || '').toLowerCase().includes(q) ||
        (order.address?.mobile || '').toLowerCase().includes(q) ||
        (order.razorpayPaymentId || '').toLowerCase().includes(q) ||
        order.items.some(it => 
          it.name.toLowerCase().includes(q) || 
          (it.cakeMessage || '').toLowerCase().includes(q) ||
          (it.selectedSize || '').toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900 tracking-tight">Orders Management</h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Monitor real-time orders, cake customisation requests, photos, and delivery statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-brand-burgundy/10 text-brand-burgundy font-bold text-xs rounded-full">
            Total Orders: {orders.length}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-zinc-200/60 p-4 sm:p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
        
        {/* Search */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] block">
            Search Orders
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Order ID, name, phone, Razorpay ID, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] block">
            Filter by Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 text-xs border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:outline-none focus:border-brand-burgundy font-semibold text-zinc-700"
          >
            <option value="All">All Statuses ({orders.length})</option>
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

      {/* Grid / Table Listing */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-zinc-200 rounded-3xl bg-white shadow-sm flex flex-col items-center justify-center space-y-3">
          <ShoppingBag className="h-10 w-10 text-zinc-300" />
          <h4 className="font-serif font-extrabold text-zinc-800 text-sm">No orders found</h4>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            {searchQuery ? 'No orders match your search criteria.' : 'Awaiting customer purchases.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500 select-none">
                  <th className="p-3.5 pl-4">Order ID & Date</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Items & Customisations</th>
                  <th className="p-3.5">Amount & Payment</th>
                  <th className="p-3.5">Logistics Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredOrders.map((order) => {
                  const hasCustomMessage = order.items.some(it => it.cakeMessage || it.customisation);
                  const hasCustomPhoto = order.items.some(it => it.customImage);
                  const hasAddons = order.items.some(it => it.addons && it.addons.length > 0);
                  const hasVariants = order.items.some(it => it.selectedSize || it.selectedType || it.flavour);

                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-amber-50/20 transition-all cursor-pointer group" 
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      {/* Order ID & Date */}
                      <td className="p-3.5 pl-4 align-top">
                        <span className="font-mono font-bold text-brand-burgundy text-xs block group-hover:underline">
                          #{order.id}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Recent'}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5 align-top">
                        <p className="font-bold text-zinc-900 leading-snug">{order.address?.name || 'Customer'}</p>
                        <p className="text-[10px] text-zinc-500 font-mono font-medium">{order.address?.mobile || 'No Mobile'}</p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                          {[order.address?.city, order.address?.pincode].filter(Boolean).join(' - ')}
                        </p>
                      </td>

                      {/* Ordered Items & Badges */}
                      <td className="p-3.5 align-top max-w-[280px]">
                        <div className="space-y-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold text-zinc-800">{it.name}</span>
                              <span className="text-zinc-500 font-bold ml-1">×{it.quantity}</span>
                              {it.selectedSize && (
                                <span className="ml-1.5 px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold">
                                  {it.selectedSize}
                                </span>
                              )}
                            </div>
                          ))}

                          {/* Customisation badges */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {hasCustomMessage && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[9px] font-bold">
                                ✍️ Message
                              </span>
                            )}
                            {hasCustomPhoto && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 rounded text-[9px] font-bold">
                                📸 Photo
                              </span>
                            )}
                            {hasAddons && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[9px] font-bold">
                                🎁 Add-ons
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Paid Amount & Payment Audit */}
                      <td className="p-3.5 align-top">
                        <p className="font-extrabold text-zinc-900 text-xs">₹{order.total}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            String(order.paymentStatus).toUpperCase() === 'PAID' || String(order.paymentStatus).toUpperCase() === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : String(order.paymentStatus).toUpperCase() === 'REFUNDED'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {String(order.paymentStatus).toUpperCase() === 'PAID' ? 'PAID' : (order.paymentStatus || 'PENDING')}
                          </span>
                        </div>
                        {order.razorpayPaymentId && (
                          <span className="text-[9px] text-zinc-400 font-mono block mt-0.5 truncate max-w-[120px]">
                            {order.razorpayPaymentId}
                          </span>
                        )}
                      </td>

                      {/* Logistics Status */}
                      <td className="p-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <select
                            value={order.status}
                            onChange={(e) => handleOrderChangeStatus(order.id, e.target.value)}
                            className={`p-1.5 text-[11px] font-bold border rounded-xl outline-none transition-all ${
                              order.status === 'Delivered' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : order.status === 'Out for Delivery'
                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                : order.status === 'Cancelled'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-[#FAF9F6] border-zinc-200 text-zinc-800 focus:bg-white'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Packed">Packed</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          {order.deliveryPartner && (
                            <span className="text-[9px] text-zinc-400 font-medium">
                              🚴 {order.deliveryPartner}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 pr-4 align-top text-right">
                        <button
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="px-2.5 py-1 text-xs font-bold text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-all inline-flex items-center gap-1 border border-brand-burgundy/20"
                        >
                          View Details <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

