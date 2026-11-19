'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Store,
  Barcode,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  QrCode,
  CreditCard,
  Banknote,
  CheckCircle2,
  X,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface PosRegister {
  id: string;
  name: string;
  code: string;
  hasActiveSession: boolean;
  activeSessionId: string | null;
}

interface PosSessionDetails {
  id: string;
  registerId: string;
  registerName: string;
  registerCode: string;
  status: string;
  openedAt: string;
  openingFloat: string;
  cashCollected: string;
  upiCollected: string;
  cardCollected: string;
  totalSales: string;
  expectedCashInDrawer: string;
  invoiceCount: number;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice?: number | string;
  sellingPrice?: number | string;
  totalStock?: number | string;
  currentStock?: number | string;
  taxRate?: number;
  hsnSacCode?: string;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  hsnCode: string;
}

export default function PosBillingPage() {
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Registers & Session State
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState('1000');
  const [closingCashInput, setClosingCashInput] = useState('0');
  const [shiftNotes, setShiftNotes] = useState('');

  // Search & Cart State
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('9999999999');

  // Checkout & Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('0');
  const [upiAmount, setUpiAmount] = useState<string>('0');
  const [cardAmount, setCardAmount] = useState<string>('0');

  // Completed Receipt Modal State
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // 1. Fetch Registers
  const { data: registers = [] } = useQuery<PosRegister[]>({
    queryKey: ['pos-registers'],
    queryFn: async () => {
      const res: any = await apiClient.get('/pos/registers');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (data.length > 0 && !selectedRegisterId) {
        setSelectedRegisterId(data[0].id);
      }
      return data;
    },
  });

  useEffect(() => {
    if (registers.length > 0 && !selectedRegisterId) {
      setSelectedRegisterId(registers[0].id);
    }
  }, [registers, selectedRegisterId]);

  // 2. Fetch Active Session
  const { data: session } = useQuery<PosSessionDetails | null>({
    queryKey: ['pos-session', selectedRegisterId],
    enabled: !!selectedRegisterId,
    queryFn: async () => {
      const res: any = await apiClient.get(`/pos/sessions/active?registerId=${selectedRegisterId}`);
      return res.data || null;
    },
  });

  // 3. Fetch Products
  const { data: products = [], isLoading: isProductsLoading } = useQuery<ProductItem[]>({
    queryKey: ['pos-products'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/products');
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // Auto focus barcode scanner
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [session]);

  // Mutations
  const openSessionMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/pos/sessions/open', {
        registerId: selectedRegisterId,
        openingFloat: parseFloat(openingFloatInput) || 0,
        notes: shiftNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-session', selectedRegisterId] });
      queryClient.invalidateQueries({ queryKey: ['pos-registers'] });
      setIsShiftModalOpen(false);
      setShiftNotes('');
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      return apiClient.post('/pos/sessions/close', {
        sessionId: session.id,
        closingCash: parseFloat(closingCashInput) || 0,
        notes: shiftNotes || undefined,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['pos-session', selectedRegisterId] });
      queryClient.invalidateQueries({ queryKey: ['pos-registers'] });
      setIsCloseShiftModalOpen(false);
      alert(`Shift closed. Expected: ₹${res.data?.expectedCash}, Counted: ₹${res.data?.closingCash}, Diff: ₹${res.data?.cashDifference}`);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/pos/checkout', payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['pos-session', selectedRegisterId] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      setReceiptData(res.data || res);
      setIsPayModalOpen(false);
      setIsReceiptModalOpen(true);
      setCart([]);
    },
    onError: (err: any) => {
      alert(err.message || err.response?.data?.message || 'Checkout failed.');
    },
  });

  // Cart Management
  const addToCart = (product: ProductItem) => {
    const price = parseFloat(product.salePrice?.toString() || product.sellingPrice?.toString() || '0');
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku || 'SKU',
          unitPrice: price,
          quantity: 1,
          taxRate: product.taxRate ?? 18,
          hsnCode: product.hsnSacCode || '998311',
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim().toLowerCase();
    if (!query) return;

    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query) ||
        (p.sku && p.sku.toLowerCase() === query) ||
        p.name.toLowerCase().includes(query)
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No product matching barcode / SKU: "${barcodeInput}"`);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalTax = cart.reduce((sum, item) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    return sum + itemSubtotal * (item.taxRate / 100);
  }, 0);
  const grandTotal = Math.round(subtotal + totalTax);

  // Fast Checkout
  const handleFastCashCheckout = () => {
    if (!session) {
      alert('Please open a register session first.');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }
    checkoutMutation.mutate({
      registerId: selectedRegisterId,
      sessionId: session.id,
      customerName,
      customerPhone,
      items: cart,
      payments: [{ mode: 'CASH', amount: grandTotal }],
    });
  };

  const openSplitPaymentModal = () => {
    if (!session) {
      alert('Please open a register session first.');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }
    setCashAmount(grandTotal.toString());
    setUpiAmount('0');
    setCardAmount('0');
    setIsPayModalOpen(true);
  };

  const handleSplitCheckout = () => {
    const c = parseFloat(cashAmount) || 0;
    const u = parseFloat(upiAmount) || 0;
    const cd = parseFloat(cardAmount) || 0;
    const totalTendered = c + u + cd;

    if (totalTendered < grandTotal) {
      alert(`Tendered amount (₹${totalTendered}) is less than total bill (₹${grandTotal}).`);
      return;
    }

    const payments = [];
    if (c > 0) payments.push({ mode: 'CASH', amount: c >= grandTotal ? grandTotal : c });
    if (u > 0) payments.push({ mode: 'UPI', amount: u });
    if (cd > 0) payments.push({ mode: 'CARD', amount: cd });

    checkoutMutation.mutate({
      registerId: selectedRegisterId,
      sessionId: session!.id,
      customerName,
      customerPhone,
      items: cart,
      payments,
    });
  };

  const cashTendered = parseFloat(cashAmount) || 0;
  const changeToReturn = Math.max(0, cashTendered - grandTotal);

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top POS Session & Register Status Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold">POS Retail Counter Billing</h1>
              {session ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  ● SHIFT OPEN
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                  ○ SHIFT CLOSED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapid barcode scanning, split payments, thermal receipts, and real-time inventory deduction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-4 text-xs font-mono bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700">
              <div>
                <span className="text-slate-400 text-[10px] block">Cash in Drawer</span>
                <span className="font-bold text-teal-400">₹{formatCurrency(session.expectedCashInDrawer)}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-400 text-[10px] block">Bills Rung Up</span>
                <span className="font-bold text-white">{session.invoiceCount}</span>
              </div>
              <button
                onClick={() => {
                  setClosingCashInput(session.expectedCashInDrawer);
                  setIsCloseShiftModalOpen(true);
                }}
                className="ml-2 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-semibold transition"
              >
                Close Shift
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" /> Start Shift / Open Drawer
            </button>
          )}
        </div>
      </div>

      {/* Main POS 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Barcode Scanner & Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Fast Scan Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or type SKU and press Enter..."
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
              >
                Scan Item
              </button>
            </form>
          </div>

          {/* Catalog Filter & Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter items by title or SKU..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                {filteredProducts.length} Items Available
              </span>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {isProductsLoading ? (
                <div className="col-span-3 py-12 text-center text-slate-400 text-xs">
                  Loading product catalog...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-slate-400 text-xs">
                  No products found. Add items to inventory.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const price = parseFloat(p.salePrice?.toString() || p.sellingPrice?.toString() || '0');
                  const stock = parseFloat(p.totalStock?.toString() || p.currentStock?.toString() || '0');

                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition bg-slate-50/50 flex flex-col justify-between h-28 group relative overflow-hidden"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-teal-900 line-clamp-2">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {p.sku || 'ITEM'}
                        </span>
                      </div>

                      <div className="flex items-end justify-between mt-2 pt-1 border-t border-slate-100">
                        <span className="text-xs font-bold font-mono text-teal-800">
                          ₹{formatCurrency(price)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          stock > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {stock} in stock
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Active Cart & Checkout Register */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            {/* Cart Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Current Bill Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)} Items)
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Customer Details Pill */}
            <div className="p-3 bg-teal-50/40 border-b border-teal-100/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Customer:</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-slate-800 text-xs w-36 outline-none"
                />
              </div>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs w-28 outline-none"
              />
            </div>

            {/* Cart Items List */}
            <div className="p-3 flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">Cart is empty. Scan barcode or tap item tiles to add.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        ₹{formatCurrency(item.unitPrice)} • GST {item.taxRate}%
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="p-1 hover:bg-white rounded text-slate-600 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold font-mono text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="p-1 hover:bg-white rounded text-slate-600 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right w-20">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        ₹{formatCurrency(item.unitPrice * item.quantity)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal (Taxable):</span>
                  <span className="font-mono font-semibold text-slate-800">₹{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST Taxes (CGST + SGST):</span>
                  <span className="font-mono font-semibold text-slate-800">₹{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Grand Total:</span>
                  <span className="font-mono text-teal-800">₹{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleFastCashCheckout}
                  disabled={cart.length === 0 || checkoutMutation.isPending || !session}
                  className="py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Banknote className="w-4 h-4" /> Cash Pay (Exact)
                </button>

                <button
                  onClick={openSplitPaymentModal}
                  disabled={cart.length === 0 || checkoutMutation.isPending || !session}
                  className="py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" /> Split Pay / UPI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" /> Open POS Shift
            </h3>
            <p className="text-xs text-slate-500">
              Enter the cash float placed in the register drawer at the start of shift.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Cash Float (₹) *</label>
              <input
                type="number"
                value={openingFloatInput}
                onChange={(e) => setOpeningFloatInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => openSessionMutation.mutate()}
                disabled={openSessionMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {openSessionMutation.isPending ? 'Opening...' : 'Start Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseShiftModalOpen && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" /> Close Shift & Reconcile
            </h3>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Opening Float:</span>
                <span>₹{session.openingFloat}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cash Sales:</span>
                <span>₹{session.cashCollected}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1">
                <span>Expected Cash:</span>
                <span>₹{session.expectedCashInDrawer}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Counted Physical Cash (₹) *</label>
              <input
                type="number"
                value={closingCashInput}
                onChange={(e) => setClosingCashInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => closeSessionMutation.mutate()}
                disabled={closeSessionMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {closeSessionMutation.isPending ? 'Closing...' : 'Close & Reconcile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment & Tender Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Payment & Tender Settlement</h3>
                <span className="text-xs text-slate-500">Bill Total: <strong className="text-teal-700 font-mono">₹{formatCurrency(grandTotal)}</strong></span>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash Tendered (₹)
                </label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-teal-600" /> UPI Dynamic Payment (₹)
                </label>
                <input
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Card / POS Machine (₹)
                </label>
                <input
                  type="number"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {changeToReturn > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Change to Return to Customer:</span>
                  <span className="text-base font-mono">₹{formatCurrency(changeToReturn)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitCheckout}
                disabled={checkoutMutation.isPending}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {checkoutMutation.isPending ? 'Processing...' : 'Complete Sale & Print'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Thermal Receipt Modal */}
      {isReceiptModalOpen && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sale Successful!
              </span>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Slip Simulation */}
            <div className="bg-slate-50 border border-slate-300 p-4 rounded-lg font-mono text-[11px] text-slate-800 whitespace-pre overflow-x-auto shadow-inner leading-relaxed">
              {receiptData.thermalReceipt}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>

              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition"
              >
                Next Customer →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
