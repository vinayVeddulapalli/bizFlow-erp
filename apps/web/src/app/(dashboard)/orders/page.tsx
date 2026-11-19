'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  ClipboardList,
  Plus,
  Search,
  ShoppingCart,
  ShoppingBag,
  Truck,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  X,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface CustomerItem {
  id: string;
  name: string;
  companyName: string | null;
}

interface SupplierItem {
  id: string;
  name: string;
  companyName: string | null;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  salePrice: string | number;
  purchasePrice: string | number;
  taxRate?: string | number;
}

interface SalesOrderItem {
  id: string;
  orderNumber: string;
  orderDate: string;
  validUntil: string | null;
  status: 'PENDING' | 'PARTIALLY_FULFILLED' | 'COMPLETED' | 'CANCELLED';
  totalTaxable: string | number;
  totalTax: string | number;
  totalAmount: string | number;
  convertedInvoiceId: string | null;
  notes: string | null;
  customer: { id: string; name: string; companyName: string | null } | null;
  lines: Array<{
    id: string;
    quantity: string | number;
    unitPrice: string | number;
    taxRate: string | number;
    lineTotal: string | number;
    product: { id: string; name: string; sku: string } | null;
  }>;
}

interface PurchaseOrderItem {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDate: string | null;
  status: string;
  totalAmount: string | number;
  supplier: { id: string; name: string; companyName: string | null } | null;
  lines: Array<{
    id: string;
    quantity: string | number;
    unitCost: string | number;
    lineTotal: string | number;
    product: { id: string; name: string; sku: string } | null;
  }>;
}

interface DeliveryChallanItem {
  id: string;
  challanNumber: string;
  challanDate: string;
  vehicleNumber: string | null;
  eWayBillNumber: string | null;
  status: string;
  customer: { id: string; name: string; companyName: string | null } | null;
  lines: Array<{
    id: string;
    quantity: string | number;
    product: { id: string; name: string; sku: string } | null;
  }>;
}

interface CreditNoteItem {
  id: string;
  noteNumber: string;
  noteDate: string;
  originalInvoiceId: string | null;
  reasonCode: string;
  taxableAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  customer: { id: string; name: string; companyName: string | null } | null;
}

interface DebitNoteItem {
  id: string;
  noteNumber: string;
  noteDate: string;
  originalBillId: string | null;
  reasonCode: string;
  taxableAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  supplier: { id: string; name: string; companyName: string | null } | null;
}

interface OrdersOverview {
  salesOrders: { pendingCount: number; totalBookedAmount: number };
  purchaseOrders: { placedCount: number; totalOrderedAmount: number };
  deliveryChallansCount: number;
  creditNotesCount: number;
  debitNotesCount: number;
}

export default function OrdersHubPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'challans' | 'credit-notes' | 'debit-notes' | 'online-orders'>('sales');
  const [search, setSearch] = useState('');

  // Modals
  const [isSoModalOpen, setIsSoModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [isCnModalOpen, setIsCnModalOpen] = useState(false);
  const [isDnModalOpen, setIsDnModalOpen] = useState(false);

  // Form States
  // 1. Sales Order Form
  const [soCustomerId, setSoCustomerId] = useState('');
  const [soProductId, setSoProductId] = useState('');
  const [soQty, setSoQty] = useState('1');
  const [soPrice, setSoPrice] = useState('');
  const [soTaxRate, setSoTaxRate] = useState('18');
  const [soNotes, setSoNotes] = useState('');

  // 2. Purchase Order Form
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState('1');
  const [poCost, setPoCost] = useState('');

  // 3. Delivery Challan Form
  const [dcCustomerId, setDcCustomerId] = useState('');
  const [dcProductId, setDcProductId] = useState('');
  const [dcQty, setDcQty] = useState('1');
  const [dcVehicle, setDcVehicle] = useState('');
  const [dcEway, setDcEway] = useState('');

  // 4. Credit Note Form
  const [cnCustomerId, setCnCustomerId] = useState('');
  const [cnProductId, setCnProductId] = useState('');
  const [cnQty, setCnQty] = useState('1');
  const [cnPrice, setCnPrice] = useState('');
  const [cnReason, setCnReason] = useState('GOODS_RETURN');

  // 5. Debit Note Form
  const [dnSupplierId, setDnSupplierId] = useState('');
  const [dnProductId, setDnProductId] = useState('');
  const [dnQty, setDnQty] = useState('1');
  const [dnCost, setDnCost] = useState('');
  const [dnReason, setDnReason] = useState('DAMAGED_SUPPLY_RETURN');

  // Overview Query
  const { data: overview } = useQuery<OrdersOverview>({
    queryKey: ['orders-overview'],
    queryFn: async () => {
      const res: any = await apiClient.get('/orders/overview');
      return res.data || res;
    },
  });

  // Master Data Queries
  const { data: customers = [] } = useQuery<CustomerItem[]>({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/customers');
      return res.data || [];
    },
  });

  const { data: suppliers = [] } = useQuery<SupplierItem[]>({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchases/suppliers');
      return res.data || [];
    },
  });

  const { data: products = [] } = useQuery<ProductItem[]>({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/products');
      return res.data || [];
    },
  });

  // Tab Data Queries
  const { data: salesOrders = [], isLoading: isSoLoading } = useQuery<SalesOrderItem[]>({
    queryKey: ['sales-orders'],
    enabled: activeTab === 'sales',
    queryFn: async () => {
      const res: any = await apiClient.get('/orders/sales');
      return res.data || [];
    },
  });

  const { data: purchaseOrders = [], isLoading: isPoLoading } = useQuery<PurchaseOrderItem[]>({
    queryKey: ['purchase-orders'],
    enabled: activeTab === 'purchases',
    queryFn: async () => {
      const res: any = await apiClient.get('/orders/purchases');
      return res.data || [];
    },
  });

  const { data: challans = [], isLoading: isChallanLoading } = useQuery<DeliveryChallanItem[]>({
    queryKey: ['delivery-challans'],
    enabled: activeTab === 'challans',
    queryFn: async () => {
      const res: any = await apiClient.get('/orders/challans');
      return res.data || [];
    },
  });

  const { data: creditNotes = [], isLoading: isCnLoading } = useQuery<CreditNoteItem[]>({
    queryKey: ['credit-notes'],
    enabled: activeTab === 'credit-notes',
    queryFn: async () => {
      const res: any = await apiClient.get('/orders/credit-notes');
      return res.data || [];
    },
  });

  const { data: debitNotes = [], isLoading: isDnLoading } = useQuery<DebitNoteItem[]>({
    queryKey: ['debit-notes'],
    enabled: activeTab === 'debit-notes',
    queryFn: async () => {
      const res: any = await apiClient.get('/orders/debit-notes');
      return res.data || [];
    },
  });

  // Online Store Orders Query
  const { data: onlineOrders = [], isLoading: isOnlineOrdersLoading } = useQuery<any[]>({
    queryKey: ['online-orders'],
    enabled: activeTab === 'online-orders',
    queryFn: async () => {
      const res: any = await apiClient.get('/store/orders');
      return Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const convertOnlineOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.post(`/store/orders/${orderId}/convert`);
    },
    onSuccess: (res: any) => {
      alert(res.data?.message || res.message || 'Online order converted to Tax Invoice!');
      queryClient.invalidateQueries({ queryKey: ['online-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to convert online order.'),
  });

  const updateOnlineOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiClient.patch(`/store/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to update order status.'),
  });

  // Convert Sales Order Mutation
  const convertSoMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.post(`/orders/sales/${orderId}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
      alert('Sales Order successfully converted to Tax Invoice! You can view it under Sales Invoices.');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to convert order to invoice.');
    },
  });

  // Mutations for Create
  const createSoMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/orders/sales', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
      setIsSoModalOpen(false);
      setSoCustomerId('');
      setSoProductId('');
      setSoPrice('');
      setSoNotes('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create sales order.'),
  });

  const createPoMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/orders/purchases', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
      setIsPoModalOpen(false);
      setPoSupplierId('');
      setPoProductId('');
      setPoCost('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create purchase order.'),
  });

  const createChallanMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/orders/challans', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-challans'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
      setIsChallanModalOpen(false);
      setDcCustomerId('');
      setDcProductId('');
      setDcVehicle('');
      setDcEway('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create delivery challan.'),
  });

  const createCnMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/orders/credit-notes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
      setIsCnModalOpen(false);
      setCnCustomerId('');
      setCnProductId('');
      setCnPrice('');
    },
    onError: (err: any) => alert(err.message || 'Failed to issue credit note.'),
  });

  const createDnMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/orders/debit-notes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['orders-overview'] });
      setIsDnModalOpen(false);
      setDnSupplierId('');
      setDnProductId('');
      setDnCost('');
    },
    onError: (err: any) => alert(err.message || 'Failed to issue debit note.'),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-teal-600" /> Advanced Orders, Challans & Notes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage Sales Orders, Vendor POs, Delivery Challans, and Credit & Debit Return Notes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sales' && (
            <button
              onClick={() => setIsSoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> New Sales Order
            </button>
          )}
          {activeTab === 'purchases' && (
            <button
              onClick={() => setIsPoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> New Purchase Order
            </button>
          )}
          {activeTab === 'challans' && (
            <button
              onClick={() => setIsChallanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> New Delivery Challan
            </button>
          )}
          {activeTab === 'credit-notes' && (
            <button
              onClick={() => setIsCnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Issue Credit Note
            </button>
          )}
          {activeTab === 'debit-notes' && (
            <button
              onClick={() => setIsDnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Issue Debit Note
            </button>
          )}
          {activeTab === 'online-orders' && (
            <a
              href="/store"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <ExternalLink className="w-4 h-4" /> Open Public Storefront
            </a>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <ShoppingCart className="w-4 h-4 text-teal-600" /> Pending SOs
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.salesOrders?.pendingCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {formatCurrency(Number(overview?.salesOrders?.totalBookedAmount || 0))} booked
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <ShoppingBag className="w-4 h-4 text-blue-600" /> Open POs
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.purchaseOrders?.placedCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {formatCurrency(Number(overview?.purchaseOrders?.totalOrderedAmount || 0))} ordered
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Truck className="w-4 h-4 text-amber-600" /> Delivery Challans
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.deliveryChallansCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched goods</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <RotateCcw className="w-4 h-4 text-rose-600" /> Credit Notes
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.creditNotesCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Customer sales returns</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <RotateCcw className="w-4 h-4 text-purple-600" /> Debit Notes
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.debitNotesCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vendor purchase returns</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'sales'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Sales Orders
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Purchase Orders
        </button>

        <button
          onClick={() => setActiveTab('challans')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'challans'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Delivery Challans
        </button>

        <button
          onClick={() => setActiveTab('credit-notes')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'credit-notes'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Credit Notes (Sales Return)
        </button>

        <button
          onClick={() => setActiveTab('debit-notes')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'debit-notes'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Debit Notes (Purchase Return)
        </button>

        <button
          onClick={() => setActiveTab('online-orders')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'online-orders'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-600" /> Online Store Orders ({onlineOrders.length})
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents or parties..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* ================= TAB 1: SALES ORDERS ================= */}
      {activeTab === 'sales' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isSoLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading sales orders...
                  </td>
                </tr>
              ) : salesOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No sales orders recorded. Click &quot;New Sales Order&quot; to book an order.
                  </td>
                </tr>
              ) : (
                salesOrders
                  .filter(
                    (o) =>
                      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                      (o.customer?.name || '').toLowerCase().includes(search.toLowerCase())
                  )
                  .map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {order.customer?.name}
                        {order.customer?.companyName && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {order.customer.companyName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(Number(order.totalTaxable))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(Number(order.totalTax))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(order.totalAmount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {order.status === 'PENDING' ? (
                          <button
                            onClick={() => convertSoMutation.mutate(order.id)}
                            disabled={convertSoMutation.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-[11px] border border-teal-200 transition"
                          >
                            Convert to Invoice <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Invoiced
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 2: PURCHASE ORDERS ================= */}
      {activeTab === 'purchases' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">PO #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPoLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No purchase orders recorded. Click &quot;New Purchase Order&quot; to issue a PO to a vendor.
                  </td>
                </tr>
              ) : (
                purchaseOrders
                  .filter(
                    (p) =>
                      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                      (p.supplier?.name || '').toLowerCase().includes(search.toLowerCase())
                  )
                  .map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {po.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(po.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {po.supplier?.name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(po.totalAmount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 3: DELIVERY CHALLANS ================= */}
      {activeTab === 'challans' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Challan #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Recipient Customer</th>
                <th className="py-3 px-4">Vehicle #</th>
                <th className="py-3 px-4">e-Way Bill #</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isChallanLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading delivery challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No delivery challans recorded. Click &quot;New Delivery Challan&quot; to dispatch goods.
                  </td>
                </tr>
              ) : (
                challans.map((dc) => (
                  <tr key={dc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-700">
                      {dc.challanNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(dc.challanDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {dc.customer?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {dc.vehicleNumber || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {dc.eWayBillNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {dc.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 4: CREDIT NOTES ================= */}
      {activeTab === 'credit-notes' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Note #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Reason Code</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Tax Credit</th>
                <th className="py-3 px-4 text-right">Total Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isCnLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading credit notes...
                  </td>
                </tr>
              ) : creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No credit notes recorded. Click &quot;Issue Credit Note&quot; to process sales returns.
                  </td>
                </tr>
              ) : (
                creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">{cn.noteNumber}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(cn.noteDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{cn.customer?.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{cn.reasonCode}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(Number(cn.taxableAmount))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(Number(cn.taxAmount))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      {formatCurrency(Number(cn.totalAmount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 5: DEBIT NOTES ================= */}
      {activeTab === 'debit-notes' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Note #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Reason Code</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Tax Debit</th>
                <th className="py-3 px-4 text-right">Total Debit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isDnLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading debit notes...
                  </td>
                </tr>
              ) : debitNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No debit notes recorded. Click &quot;Issue Debit Note&quot; to process purchase returns.
                  </td>
                </tr>
              ) : (
                debitNotes.map((dn) => (
                  <tr key={dn.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{dn.noteNumber}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(dn.noteDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{dn.supplier?.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{dn.reasonCode}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(Number(dn.taxableAmount))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(Number(dn.taxAmount))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                      {formatCurrency(Number(dn.totalAmount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 6: ONLINE STORE ORDERS ================= */}
      {activeTab === 'online-orders' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Placed Date</th>
                <th className="py-3 px-4">Customer & Phone</th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Order Total</th>
                <th className="py-3 px-4 text-center">Order Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isOnlineOrdersLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading online store orders...
                  </td>
                </tr>
              ) : onlineOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No online orders placed yet. Share your store link{' '}
                    <a href="/store" target="_blank" className="text-teal-600 underline font-semibold">
                      /store
                    </a>{' '}
                    with customers to receive online direct orders!
                  </td>
                </tr>
              ) : (
                onlineOrders
                  .filter(
                    (o) =>
                      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                      (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
                      (o.customerPhone || '').includes(search)
                  )
                  .map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(order.placedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{order.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {order.customerAddress || <span className="text-slate-400 italic">Self Pickup</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {order.lines && order.lines.length > 0 ? (
                          <span className="text-[11px] font-medium">
                            {order.lines.map((l: any) => `${Number(l.quantity)}x ${l.productName}`).join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">No items</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(order.totalAmount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            order.status === 'CONVERTED'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'CONFIRMED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {order.status === 'CONVERTED' ? (
                          <span className="text-[11px] text-teal-700 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Invoiced
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {order.status === 'NEW' && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateOnlineOrderStatusMutation.mutate({
                                    orderId: order.id,
                                    status: 'CONFIRMED',
                                  })
                                }
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 transition"
                              >
                                Accept
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => convertOnlineOrderMutation.mutate(order.id)}
                              disabled={convertOnlineOrderMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[11px] shadow-sm transition disabled:opacity-50"
                            >
                              Convert to Invoice <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODAL: NEW SALES ORDER ================= */}
      {isSoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-600" /> Book New Sales Order
              </h3>
              <button onClick={() => setIsSoModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSoMutation.mutate({
                  customerId: soCustomerId,
                  notes: soNotes || undefined,
                  lines: [
                    {
                      productId: soProductId,
                      quantity: parseFloat(soQty) || 1,
                      unitPrice: parseFloat(soPrice) || 0,
                      taxRate: parseFloat(soTaxRate) || 18,
                    },
                  ],
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer *</label>
                <select
                  required
                  value={soCustomerId}
                  onChange={(e) => setSoCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={soProductId}
                  onChange={(e) => {
                    setSoProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) {
                      setSoPrice(prod.salePrice.toString());
                      if (prod.taxRate) setSoTaxRate(prod.taxRate.toString());
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={soQty}
                    onChange={(e) => setSoQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={soPrice}
                    onChange={(e) => setSoPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">GST %</label>
                  <select
                    value={soTaxRate}
                    onChange={(e) => setSoTaxRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Order Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery requested by next Monday"
                  value={soNotes}
                  onChange={(e) => setSoNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSoModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSoMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createSoMutation.isPending ? 'Booking...' : 'Book Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW PURCHASE ORDER ================= */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" /> Issue Vendor Purchase Order
              </h3>
              <button onClick={() => setIsPoModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPoMutation.mutate({
                  supplierId: poSupplierId,
                  lines: [
                    {
                      productId: poProductId,
                      quantity: parseFloat(poQty) || 1,
                      unitCost: parseFloat(poCost) || 0,
                    },
                  ],
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier / Vendor *</label>
                <select
                  required
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={poProductId}
                  onChange={(e) => {
                    setPoProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setPoCost(prod.purchasePrice.toString());
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cost Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={poCost}
                    onChange={(e) => setPoCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPoMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createPoMutation.isPending ? 'Placing...' : 'Place Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW DELIVERY CHALLAN ================= */}
      {isChallanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" /> Dispatch Delivery Challan
              </h3>
              <button onClick={() => setIsChallanModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createChallanMutation.mutate({
                  customerId: dcCustomerId,
                  vehicleNumber: dcVehicle || undefined,
                  ewayBillNumber: dcEway || undefined,
                  lines: [
                    {
                      productId: dcProductId,
                      quantity: parseFloat(dcQty) || 1,
                    },
                  ],
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer / Consignee *</label>
                <select
                  required
                  value={dcCustomerId}
                  onChange={(e) => setDcCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product Dispatched *</label>
                <select
                  required
                  value={dcProductId}
                  onChange={(e) => setDcProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={dcQty}
                    onChange={(e) => setDcQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vehicle #</label>
                  <input
                    type="text"
                    placeholder="MH-04-AB-1234"
                    value={dcVehicle}
                    onChange={(e) => setDcVehicle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">e-Way Bill #</label>
                  <input
                    type="text"
                    placeholder="12-digit number"
                    value={dcEway}
                    onChange={(e) => setDcEway(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsChallanModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createChallanMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createChallanMutation.isPending ? 'Dispatching...' : 'Dispatch Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREDIT NOTE ================= */}
      {isCnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" /> Issue Credit Note (Sales Return)
              </h3>
              <button onClick={() => setIsCnModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCnMutation.mutate({
                  customerId: cnCustomerId,
                  reasonCode: cnReason,
                  lines: [
                    {
                      productId: cnProductId,
                      quantity: parseFloat(cnQty) || 1,
                      unitPrice: parseFloat(cnPrice) || 0,
                    },
                  ],
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer *</label>
                <select
                  required
                  value={cnCustomerId}
                  onChange={(e) => setCnCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Returned Product *</label>
                <select
                  required
                  value={cnProductId}
                  onChange={(e) => {
                    setCnProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setCnPrice(prod.salePrice.toString());
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={cnQty}
                    onChange={(e) => setCnQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Credit Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cnPrice}
                    onChange={(e) => setCnPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reason Code</label>
                  <select
                    value={cnReason}
                    onChange={(e) => setCnReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="GOODS_RETURN">Goods Return</option>
                    <option value="DEFECTIVE_PRODUCT">Defective Product</option>
                    <option value="PRICE_CORRECTION">Price Correction</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCnModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCnMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createCnMutation.isPending ? 'Issuing...' : 'Issue Credit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DEBIT NOTE ================= */}
      {isDnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-600" /> Issue Debit Note (Purchase Return)
              </h3>
              <button onClick={() => setIsDnModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createDnMutation.mutate({
                  supplierId: dnSupplierId,
                  reasonCode: dnReason,
                  lines: [
                    {
                      productId: dnProductId,
                      quantity: parseFloat(dnQty) || 1,
                      unitCost: parseFloat(dnCost) || 0,
                    },
                  ],
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier / Vendor *</label>
                <select
                  required
                  value={dnSupplierId}
                  onChange={(e) => setDnSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Returned Product *</label>
                <select
                  required
                  value={dnProductId}
                  onChange={(e) => {
                    setDnProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setDnCost(prod.purchasePrice.toString());
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={dnQty}
                    onChange={(e) => setDnQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Debit Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dnCost}
                    onChange={(e) => setDnCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reason Code</label>
                  <select
                    value={dnReason}
                    onChange={(e) => setDnReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="DAMAGED_SUPPLY_RETURN">Damaged Supply</option>
                    <option value="SHORT_SUPPLY">Short Supply</option>
                    <option value="DEFECTIVE_BATCH">Defective Batch</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsDnModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDnMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createDnMutation.isPending ? 'Issuing...' : 'Issue Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
