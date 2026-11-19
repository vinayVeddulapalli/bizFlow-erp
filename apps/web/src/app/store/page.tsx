'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  Phone,
  MapPin,
  User,
  Share2,
  Store,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  taxRate: number;
  category: string;
  totalStock: number;
  inStock: boolean;
}

interface StoreData {
  store: {
    id: string;
    name: string;
    legalName: string | null;
    gstin: string | null;
    currency: string;
    themeColor: string;
  };
  products: ProductItem[];
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

export default function PublicStorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Customer Checkout Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [orderError, setOrderError] = useState('');

  // 1. Fetch Organizations to allow selecting the store
  const { data: orgsData } = useQuery<any>({
    queryKey: ['public-store-orgs'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/organizations');
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        return list;
      } catch {
        return [];
      }
    },
  });

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  React.useEffect(() => {
    if (orgsData && orgsData.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgsData[0].id);
    }
  }, [orgsData, selectedOrgId]);

  // 2. Fetch Catalog for Selected Organization
  const { data: storeInfo, isLoading } = useQuery<StoreData>({
    queryKey: ['store-catalog', selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const res: any = await apiClient.get(`/store/public/${selectedOrgId}/catalog`);
      return res.data || res;
    },
  });

  const categories = useMemo(() => {
    if (!storeInfo?.products) return ['ALL'];
    const set = new Set<string>();
    storeInfo.products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [storeInfo]);

  const filteredProducts = useMemo(() => {
    if (!storeInfo?.products) return [];
    return storeInfo.products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [storeInfo, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const estimatedTax = cart.reduce(
    (sum, item) =>
      sum + (item.product.sellingPrice * item.quantity * item.product.taxRate) / 100,
    0
  );
  const cartTotal = cartSubtotal + estimatedTax;

  // Order Placement Mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post(`/store/public/${selectedOrgId}/order`, payload);
    },
    onSuccess: (res: any) => {
      const order = res.data || res;
      setConfirmedOrder(order);
      setCart([]);
      setIsCheckoutModalOpen(false);
      setIsCartOpen(false);
    },
    onError: (err: any) => {
      setOrderError(err.message || 'Failed to place order. Please try again.');
    },
  });

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      setOrderError('Name and phone number are required.');
      return;
    }
    setOrderError('');
    placeOrderMutation.mutate({
      customerName,
      customerPhone,
      customerAddress,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
      })),
    });
  };

  const themeColor = storeInfo?.store?.themeColor || '#0d9488';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Banner & Header */}
      <header
        className="text-white shadow-md sticky top-0 z-40"
        style={{ backgroundColor: themeColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl shadow-inner">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">
                {storeInfo?.store?.name || 'Online Storefront'}
              </h1>
              <p className="text-white/80 text-[11px]">
                {storeInfo?.store?.gstin ? `GST: ${storeInfo.store.gstin}` : 'Official Digital Store'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Store Switcher */}
            {orgsData && orgsData.length > 1 && (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="text-xs bg-white/10 text-white border border-white/20 rounded-lg px-2.5 py-1.5 outline-none font-semibold cursor-pointer"
              >
                {orgsData.map((o: any) => (
                  <option key={o.id} value={o.id} className="text-slate-900 bg-white">
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-100 transition active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black">
                  {cartCount}
                </span>
              )}
            </button>

            <Link
              href="/dashboard"
              className="text-xs text-white/80 hover:text-white underline font-semibold ml-2 hidden md:inline"
            >
              ERP Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Order Confirmed Banner */}
        {confirmedOrder && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-emerald-950 shadow-md animate-in fade-in zoom-in-95 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  Order Successfully Placed! #{confirmedOrder.orderNumber}
                </h3>
                <p className="text-xs text-emerald-700">
                  Thank you, <strong>{confirmedOrder.customerName}</strong>! Your order has been registered and sent to the store merchant.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-emerald-800">
                Total Amount: {formatCurrency(Number(confirmedOrder.totalAmount))}
              </span>
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `Hi, I have placed online order #${confirmedOrder.orderNumber} for total ${formatCurrency(
                      Number(confirmedOrder.totalAmount)
                    )}. Please confirm dispatch!`
                  );
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Order on WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* Hero & Search Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Live Inventory Catalogue
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Order Directly From Our Verified Inventory
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Real-time stock availability, transparent GST tax pricing, and automated order processing.
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat === 'ALL' ? 'All Products' : cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Loading storefront catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center text-slate-500 space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-800">No products found</h3>
            <p className="text-xs text-slate-400">
              Try searching for another item or choose another category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        {p.category}
                      </span>
                      {p.inStock ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          In Stock ({p.totalStock})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          Pre-Order
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition">
                        {p.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        SKU: {p.sku}
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        {formatCurrency(p.sellingPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        + {p.taxRate}% GST included
                      </div>
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-teal-800 shadow-sm flex items-center justify-center font-bold hover:bg-slate-100 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-xs text-teal-900 px-1">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(p.id, 1)}
                          className="w-7 h-7 rounded-lg bg-teal-600 text-white shadow-sm flex items-center justify-center font-bold hover:bg-teal-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Slide-over Shopping Cart */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-150">
            {/* Cart Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Shopping Cart ({cartCount})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-semibold text-sm">Your cart is empty</p>
                  <p className="text-xs">Add products from the catalog to place an order.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {item.product.name}
                      </h4>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatCurrency(item.product.sellingPrice)} each
                      </div>
                      <div className="text-xs font-black text-slate-900 font-mono">
                        {formatCurrency(item.product.sellingPrice * item.quantity)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs px-1 text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax (GST):</span>
                    <span className="font-mono font-semibold">{formatCurrency(estimatedTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Estimated Total:</span>
                    <span className="font-mono text-teal-700">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                >
                  Proceed to Checkout ({cartCount} Items)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" /> Customer & Delivery Details
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-4">
              {orderError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {orderError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mobile / Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9820011223"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Delivery Address (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      placeholder="Building, street, landmark, city, postal code..."
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary in Modal */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Items:</span>
                  <span className="font-semibold">{cartCount} units</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-200">
                  <span>Payable at Delivery / UPI:</span>
                  <span className="font-mono text-teal-700">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={placeOrderMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-md flex items-center gap-1.5"
                >
                  {placeOrderMutation.isPending ? 'Placing Order...' : 'Confirm & Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
