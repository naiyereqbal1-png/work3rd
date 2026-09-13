import React, { useState } from 'react';
import { Search, Users, ShoppingBag, Eye, Calendar, Phone, Mail } from 'lucide-react';
import { Customer, Order } from '../../types';
import { db } from '../../services/db';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerOrders(db.getCustomerOrders(c.customer_id));
  };

  const filteredCustomers = customers.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchMobile = c.mobile.includes(q);
      const matchId = c.customer_id.toLowerCase().includes(q);
      if (!matchName && !matchMobile && !matchId) return false;
    }
    return true;
  });

  return (
    <div id="admin-customers-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Registered Customer Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified Indian mobile users, purchase histories, and delivery profiles.
          </p>
        </div>

        <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl">
          Total Customers: <span className="text-indigo-700 font-extrabold">{customers.length}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer ID, name, or +91 mobile..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-hidden focus:border-indigo-600 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Two Column Layout: Customers Table + Customer Profile Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customers Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="p-3.5">Customer ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Mobile</th>
                  <th className="p-3.5">Total Orders</th>
                  <th className="p-3.5">Total Spent</th>
                  <th className="p-3.5">Registered On</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-indigo-700">{c.customer_id}</td>
                      <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3.5 font-mono text-slate-600">+91 {c.mobile}</td>
                      <td className="p-3.5 font-bold text-slate-800">{c.total_orders ?? 0} orders</td>
                      <td className="p-3.5 font-extrabold text-slate-900">
                        ₹{(c.total_spent ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3.5 text-right">
                        <button className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:border-indigo-600 hover:text-indigo-600 shadow-2xs">
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Profile & History */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <span className="font-mono text-[10px] text-indigo-700 font-bold">
                  {selectedCustomer.customer_id}
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedCustomer.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> +91 {selectedCustomer.mobile}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Orders</span>
                  <p className="text-base font-black text-slate-900">
                    {selectedCustomer.total_orders}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Total Volume
                  </span>
                  <p className="text-base font-black text-emerald-700">
                    ₹{(selectedCustomer.total_spent ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Saved Delivery Addresses ({(selectedCustomer.addresses || []).length})
                </span>
                <div className="space-y-2">
                  {(selectedCustomer.addresses || []).map((addr) => (
                    <div
                      key={addr.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                    >
                      <p className="font-bold text-slate-800">{addr.name}</p>
                      <p className="text-slate-600 text-[11px]">{addr.address}</p>
                      <p className="text-slate-600 text-[11px]">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order History */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Order History ({customerOrders.length})
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customerOrders.length === 0 ? (
                    <p className="text-xs text-slate-400">No orders placed yet.</p>
                  ) : (
                    customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-700 text-[11px]">
                            {ord.order_id}
                          </span>
                          <span className="font-black text-slate-900">
                            ₹{(ord.total ?? 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                          <span>{(ord.items || []).length} garments</span>
                          <span className="font-bold text-slate-700">{ord.order_status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">Select a customer to view their complete profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
