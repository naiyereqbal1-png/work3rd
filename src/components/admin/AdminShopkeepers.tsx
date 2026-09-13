import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Boxes,
  Shield,
  Eye,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  History,
  AlertTriangle,
  Lock,
  Unlock,
  PackageCheck,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../services/db';
import { Shopkeeper, ShopkeeperPermissions, Product, StockTransaction } from '../../types';

export const AdminShopkeepers: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'PARTNERS' | 'APPROVALS' | 'TRANSACTIONS'>('PARTNERS');
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>(db.getShopkeepers());
  const [allProducts, setAllProducts] = useState<Product[]>(db.getAllProducts());
  const [transactions, setTransactions] = useState<StockTransaction[]>(db.getStockTransactions());

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditPermissionsModalOpen, setIsEditPermissionsModalOpen] = useState(false);
  const [editingShopkeeper, setEditingShopkeeper] = useState<Shopkeeper | null>(null);

  // New Shopkeeper Form
  const [newName, setNewName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCity, setNewCity] = useState('New Delhi');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Rejection modal
  const [rejectModalProduct, setRejectModalProduct] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState('Image resolution too low. Please upload clear front and back angles.');
  const [adminPriceOverrides, setAdminPriceOverrides] = useState<Record<string, number>>({});

  const refreshData = () => {
    setShopkeepers(db.getShopkeepers());
    setAllProducts(db.getAllProducts());
    setTransactions(db.getStockTransactions());
  };

  useEffect(() => {
    const unsub = db.subscribe(() => {
      refreshData();
    });
    return unsub;
  }, []);

  const pendingProducts = allProducts.filter((p) => p.approval_status === 'PENDING');

  const handleCreateShopkeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSaving(true);

    try {
      const created = await db.createShopkeeperAsync({
        name: newName,
        store_name: newStoreName,
        mobile: newMobile,
        email: newEmail,
        city: newCity,
      });

      setFormSuccess(`Shopkeeper partner "${created.name}" created successfully with ID: ${created.shopkeeper_id}`);
      setNewName('');
      setNewStoreName('');
      setNewMobile('');
      setNewEmail('');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create shopkeeper. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = async (key: keyof ShopkeeperPermissions) => {
    if (!editingShopkeeper) return;
    const updatedPerms: ShopkeeperPermissions = {
      ...editingShopkeeper.permissions,
      [key]: !editingShopkeeper.permissions[key],
    };

    try {
      const res = await db.updateShopkeeperAsync(editingShopkeeper.id, {
        permissions: updatedPerms,
      });
      if (res) {
        setEditingShopkeeper(res);
        refreshData();
      }
    } catch (err: any) {
      console.error("[Admin Shopkeepers] Toggle permission error:", err);
      alert("Failed to update permissions: " + err.message);
    }
  };

  const handleApprove = (product: Product) => {
    try {
      const customAdminPrice = adminPriceOverrides[product.id];
      if (customAdminPrice !== undefined && customAdminPrice > 0) {
        db.adminSetProductSellingPrice(product.id, customAdminPrice);
      }
      db.adminApproveProduct(product.id, 'admin-1', 'Admin Lead');
      // Also automatically make it live if stock > 0
      db.adminSetProductLive(product.id, true);
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectModalProduct) return;
    try {
      db.adminRejectProduct(rejectModalProduct.id, rejectReason, 'admin-1', 'Admin Lead');
      setRejectModalProduct(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    }
  };

  const handleToggleLive = (product: Product) => {
    try {
      db.adminSetProductLive(product.id, !product.is_live);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const filteredShopkeepers = shopkeepers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.store_name || '').toLowerCase().includes(q) ||
      s.mobile.includes(q) ||
      s.shopkeeper_id.toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q)
    );
  });

  const filteredTransactions = transactions.filter((t) => {
    if (selectedShopkeeperId !== 'ALL' && t.shopkeeper_id !== selectedShopkeeperId) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Store className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">Shopkeeper Partners & Centralized Inventory</h2>
          </div>
          <p className="text-xs text-slate-500">
            Authorize local merchants, moderate products, configure granular permissions, and track live Stock IN / Stock OUT.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setFormSuccess('');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Shopkeeper Partner</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('PARTNERS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'PARTNERS'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shopkeeper Partners ({shopkeepers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('APPROVALS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'APPROVALS'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          {pendingProducts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingProducts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('TRANSACTIONS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'TRANSACTIONS'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Ledger ({transactions.length})</span>
        </button>
      </div>

      {/* TAB 1: SHOPKEEPER PARTNERS LIST */}
      {activeSubTab === 'PARTNERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, store, mobile, city, or ID..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredShopkeepers.length} partner{filteredShopkeepers.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShopkeepers.map((shop) => {
              const shopProds = allProducts.filter((p) => p.shopkeeper_id === shop.id);
              const liveCount = shopProds.filter((p) => p.approval_status === 'APPROVED' && p.is_live).length;
              const pendingCount = shopProds.filter((p) => p.approval_status === 'PENDING').length;
              const totalStock = shopProds.reduce((sum, p) => sum + (p.stock || 0), 0);

              return (
                <div
                  key={shop.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {shop.shopkeeper_id}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1">{shop.name}</h3>
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>{shop.store_name || 'Retail Partner'}</span>
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          shop.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 mb-4">
                      <div>Mobile: <strong className="text-slate-900 font-mono">+91 {shop.mobile}</strong></div>
                      <div>City: <span className="text-slate-800">{shop.city || 'India'}</span></div>
                      <div>Email: <span className="text-slate-800">{shop.email || 'N/A'}</span></div>
                    </div>

                    {/* Stats Pill Matrix */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center mb-4">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Products</div>
                        <div className="text-sm font-black text-slate-800">{shopProds.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-600 font-bold uppercase">Live</div>
                        <div className="text-sm font-black text-emerald-700">{liveCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-600 font-bold uppercase">Pending</div>
                        <div className="text-sm font-black text-amber-700">{pendingCount}</div>
                      </div>
                      <div className="col-span-3 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] px-1">
                        <span className="text-slate-500 font-medium">In-Stock Units:</span>
                        <span className="font-bold text-slate-900 font-mono">{totalStock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setEditingShopkeeper(shop);
                        setIsEditPermissionsModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>Permissions</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedShopkeeperId(shop.id);
                        setActiveSubTab('TRANSACTIONS');
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Stock Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING APPROVALS */}
      {activeSubTab === 'APPROVALS' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <span>
              <strong>Review Queue:</strong> Products added by shopkeepers remain offline until reviewed and approved by administrators.
            </span>
            <span className="font-bold font-mono">{pendingProducts.length} Pending</span>
          </div>

          {pendingProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <PackageCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800">All Products Reviewed</h3>
              <p className="text-xs text-slate-500 mt-1">There are no pending shopkeeper product approval requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingProducts.map((p) => {
                const primaryImg = p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80';
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 bg-slate-100 overflow-hidden">
                        <img
                          src={primaryImg}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                          PENDING APPROVAL
                        </div>
                        <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                          {p.images?.length || 1} image{p.images?.length === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>SKU: <strong className="text-slate-800 font-mono">{p.sku}</strong></span>
                          <span>{p.category_name}</span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 line-clamp-1">{p.name}</h4>

                        <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Merchant:</span>
                            <span className="font-bold text-slate-800">{p.shopkeeper_name || 'Partner Store'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Shopkeeper Price:</span>
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                              ₹{p.shopkeeper_price !== undefined ? p.shopkeeper_price : p.selling_price} (Internal)
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">MRP:</span>
                            <span className="font-medium text-slate-500">₹{p.mrp}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                            <label className="text-slate-700 font-bold">Admin Selling Price:</label>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 font-bold">₹</span>
                              <input
                                type="number"
                                value={adminPriceOverrides[p.id] !== undefined ? adminPriceOverrides[p.id] : (p.admin_selling_price || p.selling_price)}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setAdminPriceOverrides((prev) => ({ ...prev, [p.id]: isNaN(val) ? 0 : val }));
                                }}
                                className="w-20 px-2 py-0.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                                placeholder="Price"
                                min="1"
                                max={p.mrp}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Initial Stock:</span>
                            <span className="font-bold text-emerald-700 font-mono">{p.stock} units</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                          "{p.description}"
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setRejectModalProduct(p);
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleApprove(p)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve & Go Live</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENT LEDGER */}
      {activeSubTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Filter by Merchant:</label>
              <select
                value={selectedShopkeeperId}
                onChange={(e) => setSelectedShopkeeperId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Merchants & Master Store</option>
                {shopkeepers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.store_name || s.shopkeeper_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Total Transactions: <strong className="text-slate-900">{filteredTransactions.length}</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tx ID / Date</th>
                    <th className="px-4 py-3">Product / SKU</th>
                    <th className="px-4 py-3">Merchant Store</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-center">Prev → New</th>
                    <th className="px-4 py-3">Performed By</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const isIncrease = tx.transaction_type === 'IN' || tx.transaction_type === 'RETURN_STOCK_IN';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono">
                          <div className="font-bold text-slate-900">{tx.transaction_id}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800 line-clamp-1">{tx.product_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{tx.sku}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {tx.shopkeeper_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isIncrease
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isIncrease ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            )}
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black font-mono text-sm">
                          <span className={isIncrease ? 'text-emerald-700' : 'text-rose-700'}>
                            {isIncrease ? `+${tx.quantity}` : `-${tx.quantity}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-500">
                          {tx.previous_stock} → <strong className="text-slate-900">{tx.new_stock}</strong>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{tx.performed_by_name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">{tx.performed_by}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                          {tx.reference_note || tx.reason || 'Standard update'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD SHOPKEEPER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-400" />
                <span>Register New Shopkeeper Partner</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShopkeeper} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shopkeeper / Proprietor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rajesh Mehra"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Store / Brand Name
                </label>
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="e.g. Mehra Ethnic Studio"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (10 Digits) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-bold text-slate-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9810101010"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rajesh@studio.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                Default privileges include Catalog submission, Stock IN, Stock OUT, and Order review. You can customize permissions anytime.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 ${
                    isSaving ? 'opacity-70 cursor-not-allowed bg-slate-400 hover:bg-slate-400' : ''
                  }`}
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Shopkeeper'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PERMISSIONS */}
      {isEditPermissionsModalOpen && editingShopkeeper && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Granular Permissions: {editingShopkeeper.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{editingShopkeeper.shopkeeper_id}</p>
              </div>
              <button
                onClick={() => setIsEditPermissionsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-600 mb-2">
                Toggle exact feature privileges for this merchant. Changes take effect instantly in their portal.
              </p>

              {[
                { key: 'can_add_product', label: 'Add New Products', desc: 'Can add products to catalog (subject to Admin approval)' },
                { key: 'can_edit_product', label: 'Edit Own Products', desc: 'Can update title, description, and specifications' },
                { key: 'can_stock_in', label: 'Stock IN (Inward)', desc: 'Can replenish inward stock units with traceable notes' },
                { key: 'can_stock_out', label: 'Stock OUT (Deduction)', desc: 'Can deduct damaged or offline sold inventory' },
                { key: 'can_view_orders', label: 'View Customer Orders', desc: 'Can inspect orders containing their garments' },
                { key: 'can_view_stock_history', label: 'View Stock History', desc: 'Can audit complete stock movement ledger' },
                { key: 'can_edit_price', label: 'Edit Selling Price & MRP', desc: 'Can adjust prices and discounts on their products' },
                { key: 'can_edit_category', label: 'Change Categories', desc: 'Can alter assigned garment category classification' },
                { key: 'can_edit_images', label: 'Upload / Modify Images', desc: 'Can upload up to 4 garment product images' },
              ].map(({ key, label, desc }) => {
                const permKey = key as keyof ShopkeeperPermissions;
                const isEnabled = editingShopkeeper.permissions[permKey];
                return (
                  <div
                    key={key}
                    onClick={() => handleTogglePermission(permKey)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{label}</div>
                      <div className="text-[11px] text-slate-500">{desc}</div>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full p-1 transition-colors flex items-center ${
                        isEnabled ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsEditPermissionsModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT PRODUCT WITH REASON */}
      {rejectModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-300" />
                <span>Reject Product: {rejectModalProduct.name}</span>
              </h3>
              <button
                onClick={() => setRejectModalProduct(null)}
                className="text-rose-200 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Rejection (Returned to Shopkeeper)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setRejectModalProduct(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
