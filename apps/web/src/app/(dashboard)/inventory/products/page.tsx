'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Warehouse,
  QrCode,
  Calendar,
  Tag,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

interface StockLevel {
  warehouseId: string;
  warehouse: { name: string; code: string };
  quantity: string | number;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  hsnSacCode: string | null;
  salePrice: string | number;
  sellingPrice?: string | number;
  purchasePrice: string | number;
  taxRate: string | number;
  minStockLevel: string | number;
  totalStock: string | number;
  currentStock?: string | number;
  isLowStock: boolean;
  category?: { id: string; name: string } | null;
  uom?: { id: string; name: string; code?: string; symbol?: string } | null;
  stockLevels: StockLevel[];
}

interface BatchItem {
  id: string;
  productId: string;
  batchNumber: string;
  mfgDate: string | null;
  expiryDate: string | null;
  mrp: string | number;
  purchasePrice: string | number;
  salePrice: string | number;
  currentStock: string | number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  product: { id: string; name: string; sku: string } | null;
  warehouse: { id: string; name: string; code: string } | null;
}

interface SerialItem {
  id: string;
  productId: string;
  serialNumber: string;
  status: string;
  warrantyExpiry: string | null;
  product: { id: string; name: string; sku: string } | null;
}

interface ConversionItem {
  id: string;
  productId: string;
  conversionRatio: string | number;
  product: { id: string; name: string; sku: string } | null;
  primaryUnit: { id: string; name: string; code: string } | null;
  secondaryUnit: { id: string; name: string; code: string } | null;
}

interface PriceMatrixItem {
  id: string;
  partyType: string;
  partyId: string;
  specialPrice: string | number;
  minOrderQty: string | number | null;
  discountPct: string | number | null;
  product: { id: string; name: string; sku: string; sellingPrice: string | number } | null;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'catalog' | 'batches' | 'serials' | 'conversions' | 'pricing'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  // Product Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uomId, setUomId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [openingStock, setOpeningStock] = useState('0');
  const [openingCost, setOpeningCost] = useState('0');
  const [warehouseId, setWarehouseId] = useState('');

  // Batch Form state
  const [batchProductId, setBatchProductId] = useState('');
  const [batchWarehouseId, setBatchWarehouseId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchMrp, setBatchMrp] = useState('');
  const [batchCost, setBatchCost] = useState('');
  const [batchSalePrice, setBatchSalePrice] = useState('');
  const [batchStock, setBatchStock] = useState('0');

  // Serial Form state
  const [serialProductId, setSerialProductId] = useState('');
  const [serialWarehouseId, setSerialWarehouseId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');

  // Conversion Form state
  const [convProductId, setConvProductId] = useState('');
  const [convPrimaryUnitId, setConvPrimaryUnitId] = useState('');
  const [convSecondaryUnitId, setConvSecondaryUnitId] = useState('');
  const [conversionRatio, setConversionRatio] = useState('10');

  // Pricing Form state
  const [pricePartyType, setPricePartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [pricePartyId, setPricePartyId] = useState('');
  const [priceProductId, setPriceProductId] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [minOrderQty, setMinOrderQty] = useState('');
  const [discountPct, setDiscountPct] = useState('');

  // Queries
  const { data: products = [], isLoading } = useQuery<ProductItem[]>({
    queryKey: ['products', searchTerm, categoryFilter, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (lowStockOnly) params.append('lowStockOnly', 'true');
      const res: any = await apiClient.get(`/inventory/products?${params.toString()}`);
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/categories');
      return res.data;
    },
  });

  const { data: uoms = [] } = useQuery<Array<{ id: string; name: string; code?: string; symbol?: string }>>({
    queryKey: ['inventory-uoms'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/uoms');
      return res.data;
    },
  });

  const { data: warehouses = [] } = useQuery<Array<{ id: string; name: string; code: string }>>({
    queryKey: ['inventory-warehouses'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/warehouses');
      return res.data;
    },
  });

  const { data: batches = [], isLoading: isBatchesLoading } = useQuery<BatchItem[]>({
    queryKey: ['inventory-batches'],
    enabled: activeTab === 'batches',
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/advanced/batches');
      return res.data || [];
    },
  });

  const { data: serials = [], isLoading: isSerialsLoading } = useQuery<SerialItem[]>({
    queryKey: ['inventory-serials'],
    enabled: activeTab === 'serials',
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/advanced/serials');
      return res.data || [];
    },
  });

  const { data: conversions = [], isLoading: isConversionsLoading } = useQuery<ConversionItem[]>({
    queryKey: ['inventory-conversions'],
    enabled: activeTab === 'conversions',
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/advanced/conversions');
      return res.data || [];
    },
  });

  const { data: priceMatrices = [], isLoading: isPricingLoading } = useQuery<PriceMatrixItem[]>({
    queryKey: ['inventory-pricing'],
    enabled: activeTab === 'pricing',
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/advanced/price-matrix');
      return res.data || [];
    },
  });

  const { data: customers = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/customers');
      return res.data || [];
    },
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/inventory/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to create product. Check SKU uniqueness.');
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/inventory/advanced/batches', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      setIsBatchModalOpen(false);
      setBatchNumber('');
      setBatchMrp('');
      setBatchCost('');
      setBatchSalePrice('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create batch.'),
  });

  const createSerialMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/inventory/advanced/serials', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-serials'] });
      setIsSerialModalOpen(false);
      setSerialNumber('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create serial.'),
  });

  const createConversionMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.put('/inventory/advanced/conversions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-conversions'] });
      setIsConversionModalOpen(false);
    },
    onError: (err: any) => alert(err.message || 'Failed to save conversion.'),
  });

  const createPricingMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.put('/inventory/advanced/price-matrix', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-pricing'] });
      setIsPricingModalOpen(false);
      setSpecialPrice('');
    },
    onError: (err: any) => alert(err.message || 'Failed to save price matrix.'),
  });

  const resetForm = () => {
    setName('');
    setSku('');
    setBarcode('');
    setHsnSacCode('');
    setCategoryId('');
    setUomId('');
    setSalePrice('');
    setPurchasePrice('');
    setTaxRate('18');
    setMinStockLevel('5');
    setOpeningStock('0');
    setOpeningCost('0');
    setWarehouseId('');
    setModalError('');
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('Product name is required.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      hsnSacCode: hsnSacCode.trim() || undefined,
      categoryId: categoryId || undefined,
      uomId: uomId || undefined,
      salePrice: parseFloat(salePrice) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0,
      taxRate: parseFloat(taxRate) || 0,
      minStockLevel: parseFloat(minStockLevel) || 0,
    };

    if (parseFloat(openingStock) > 0) {
      payload.openingStock = {
        quantity: parseFloat(openingStock),
        unitCost: parseFloat(openingCost) || parseFloat(purchasePrice) || 0,
        warehouseId: warehouseId || warehouses[0]?.id,
      };
    }

    createProductMutation.mutate(payload);
  };

  const lowStockCount = products.filter((p) => p.isLowStock).length;
  const expiringCount = batches.filter((b) => b.isExpiringSoon || b.isExpired).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-600" /> Advanced Inventory & Stock Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Batch tracking with expiry alerts, serial numbers, primary/secondary UOM conversions & price matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'catalog' && (
            <>
              <Link
                href="/inventory/transfers"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" /> Transfer Stock
              </Link>
              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </>
          )}

          {activeTab === 'batches' && (
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Batch
            </button>
          )}

          {activeTab === 'serials' && (
            <button
              onClick={() => setIsSerialModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Serial
            </button>
          )}

          {activeTab === 'conversions' && (
            <button
              onClick={() => setIsConversionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Conversion
            </button>
          )}

          {activeTab === 'pricing' && (
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Party Price
            </button>
          )}
        </div>
      </div>

      {/* KPI & Alert Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Package className="w-4 h-4 text-teal-600" /> Active Catalog
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {products.length} Items
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ready for billing & sales</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Warehouse className="w-4 h-4 text-blue-600" /> Warehouses
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {warehouses.length} Units
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Multi-location storage</div>
        </div>

        <div
          onClick={() => {
            setActiveTab('catalog');
            setLowStockOnly(!lowStockOnly);
          }}
          className={`border rounded-xl p-3 shadow-sm cursor-pointer transition ${
            lowStockCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Low Stock Alerts
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-amber-700">
            {lowStockCount} Products
          </div>
          <div className="text-[11px] text-amber-600 underline mt-0.5">
            {lowStockOnly ? 'Showing low stock' : 'Click to filter'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('batches')}
          className={`border rounded-xl p-3 shadow-sm cursor-pointer transition ${
            expiringCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4 text-rose-600" /> Expiry Warnings
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-rose-700">
            {expiringCount} Batches
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">Expiring or expired items</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Catalog & Stock
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'batches'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Batches & Expiry Tracker
        </button>

        <button
          onClick={() => setActiveTab('serials')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'serials'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" /> Serial Numbers
        </button>

        <button
          onClick={() => setActiveTab('conversions')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'conversions'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" /> Unit Conversions (UOM)
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'pricing'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" /> Party Price Matrix
        </button>
      </div>

      {/* ================= TAB 1: PRODUCT CATALOG ================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by product name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                Low Stock Only
              </label>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category & Unit</th>
                    <th className="py-3 px-4 text-right">Sale Price</th>
                    <th className="py-3 px-4 text-right">Purchase Cost</th>
                    <th className="py-3 px-4 text-right">Tax Rate</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center">Threshold</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        Loading inventory records...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No products found. Click &quot;Add Product&quot; to initialize items.
                      </td>
                    </tr>
                  ) : (
                    products.map((item: any) => {
                      const stockRaw = item.totalStock ?? item.currentStock ?? 0;
                      const stock = parseFloat(stockRaw?.toString() || '0');
                      const minStock = parseFloat(item.minStockLevel?.toString() || '0');
                      const saleP = item.salePrice ?? item.sellingPrice ?? 0;
                      const purchP = item.purchasePrice ?? 0;

                      let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      let badgeText = 'In Stock';

                      if (stock <= 0) {
                        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                        badgeText = 'Out of Stock';
                      } else if (item.isLowStock || (minStock > 0 && stock <= minStock)) {
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        badgeText = 'Low Stock';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div>{item.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal flex items-center gap-2">
                              {item.sku && <span>SKU: {item.sku}</span>}
                              {item.barcode && <span>• Barcode: {item.barcode}</span>}
                              {item.hsnSacCode && <span>• HSN: {item.hsnSacCode}</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {item.category?.name || 'Uncategorized'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.uom?.name || 'Pieces'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(Number(saleP))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            {formatCurrency(Number(purchP))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            {item.taxRate}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {stock}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {minStock}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                            >
                              {badgeText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: BATCHES & EXPIRY ================= */}
      {activeTab === 'batches' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Batch #</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Mfg Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">MRP (₹)</th>
                <th className="py-3 px-4 text-right">Sale Price (₹)</th>
                <th className="py-3 px-4 text-center">Batch Stock</th>
                <th className="py-3 px-4 text-center">Expiry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isBatchesLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading batch records...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No product batches registered. Click &quot;Add Batch&quot; to initialize batch tracking.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {b.product?.name}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {b.product?.sku}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">
                      {b.batchNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{b.warehouse?.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {b.mfgDate ? new Date(b.mfgDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(Number(b.mrp))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(Number(b.salePrice))}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {Number(b.currentStock)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          EXPIRED
                        </span>
                      ) : b.isExpiringSoon ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          EXPIRING SOON
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          VALID
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

      {/* ================= TAB 3: SERIAL NUMBERS ================= */}
      {activeTab === 'serials' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Warranty Expiry</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isSerialsLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading serial numbers...
                  </td>
                </tr>
              ) : serials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No unit serial numbers recorded. Click &quot;Add Serial&quot; to register trackable items.
                  </td>
                </tr>
              ) : (
                serials.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {s.product?.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {s.serialNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.warrantyExpiry ? new Date(s.warrantyExpiry).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 4: CONVERSIONS ================= */}
      {activeTab === 'conversions' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Primary Unit</th>
                <th className="py-3 px-4">Secondary Unit</th>
                <th className="py-3 px-4">Conversion Equation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isConversionsLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading unit conversions...
                  </td>
                </tr>
              ) : conversions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No dual unit conversions set. Click &quot;Add Conversion&quot; to configure box-to-piece ratios.
                  </td>
                </tr>
              ) : (
                conversions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.product?.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {c.primaryUnit?.name} ({c.primaryUnit?.code})
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {c.secondaryUnit?.name} ({c.secondaryUnit?.code})
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">
                      1 {c.primaryUnit?.code} = {Number(c.conversionRatio)} {c.secondaryUnit?.code}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 5: PRICING MATRIX ================= */}
      {activeTab === 'pricing' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Party Type</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Standard Rate</th>
                <th className="py-3 px-4 text-right">Party Special Rate</th>
                <th className="py-3 px-4 text-center">Min Order Qty</th>
                <th className="py-3 px-4 text-center">Special Discount %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPricingLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading price matrix...
                  </td>
                </tr>
              ) : priceMatrices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No client-specific pricing configured. Click &quot;Add Party Price&quot; to set contract rates.
                  </td>
                </tr>
              ) : (
                priceMatrices.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-700">{pm.partyType}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{pm.product?.name}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(Number(pm.product?.sellingPrice || 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                      {formatCurrency(Number(pm.specialPrice))}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {pm.minOrderQty ? Number(pm.minOrderQty) : '1'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                      {pm.discountPct ? `${pm.discountPct}%` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODAL: ADD PRODUCT ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" /> Add New Product to Catalog
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ergonomic Executive Mesh Chair"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="CHAIR-ERG-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Barcode / EAN</label>
                  <input
                    type="text"
                    placeholder="8901234567890"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="940310"
                    value={hsnSacCode}
                    onChange={(e) => setHsnSacCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Unit (UOM)</label>
                  <select
                    value={uomId}
                    onChange={(e) => setUomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="">-- Choose UOM --</option>
                    {uoms.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code || u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="8500"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-teal-800 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="6000"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono text-slate-700 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">GST Tax Rate %</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs font-bold text-slate-700 mb-2">Initial Opening Stock (Optional)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Opening Quantity</label>
                    <input
                      type="number"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Cost Per Unit (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingCost}
                      onChange={(e) => setOpeningCost(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Warehouse</label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createProductMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD BATCH ================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" /> Create Product Batch & Expiry
              </h3>
              <button onClick={() => setIsBatchModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBatchMutation.mutate({
                  productId: batchProductId,
                  warehouseId: batchWarehouseId || undefined,
                  batchNumber,
                  mfgDate: mfgDate || undefined,
                  expiryDate: expiryDate || undefined,
                  mrp: parseFloat(batchMrp) || 0,
                  purchasePrice: parseFloat(batchCost) || 0,
                  salePrice: parseFloat(batchSalePrice) || 0,
                  currentStock: parseFloat(batchStock) || 0,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={batchProductId}
                  onChange={(e) => setBatchProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Batch # *</label>
                  <input
                    type="text"
                    required
                    placeholder="BATCH-2026-A1"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Warehouse</label>
                  <select
                    value={batchWarehouseId}
                    onChange={(e) => setBatchWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Default Warehouse --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={batchMrp}
                    onChange={(e) => setBatchMrp(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Sale Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={batchSalePrice}
                    onChange={(e) => setBatchSalePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Batch Stock</label>
                  <input
                    type="number"
                    value={batchStock}
                    onChange={(e) => setBatchStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createBatchMutation.isPending ? 'Saving...' : 'Register Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SERIAL ================= */}
      {isSerialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-teal-600" /> Add Serial Number
              </h3>
              <button onClick={() => setIsSerialModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSerialMutation.mutate({
                  productId: serialProductId,
                  warehouseId: serialWarehouseId || undefined,
                  serialNumber,
                  warrantyExpiry: warrantyExpiry || undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={serialProductId}
                  onChange={(e) => setSerialProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Warehouse</label>
                <select
                  value={serialWarehouseId}
                  onChange={(e) => setSerialWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Default Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Serial Number *</label>
                <input
                  type="text"
                  required
                  placeholder="SN-98234-A"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Warranty Expiry</label>
                <input
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSerialModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSerialMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createSerialMutation.isPending ? 'Saving...' : 'Register Serial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD CONVERSION ================= */}
      {isConversionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" /> Dual UOM Conversion
              </h3>
              <button onClick={() => setIsConversionModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createConversionMutation.mutate({
                  productId: convProductId,
                  primaryUnitId: convPrimaryUnitId,
                  secondaryUnitId: convSecondaryUnitId,
                  conversionRatio: parseFloat(conversionRatio) || 1,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={convProductId}
                  onChange={(e) => setConvProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Unit (e.g. Box) *</label>
                <select
                  required
                  value={convPrimaryUnitId}
                  onChange={(e) => setConvPrimaryUnitId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Unit --</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code || u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Secondary Unit (e.g. Pcs) *</label>
                <select
                  required
                  value={convSecondaryUnitId}
                  onChange={(e) => setConvSecondaryUnitId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Unit --</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code || u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  1 Primary Unit = How Many Secondary? *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={conversionRatio}
                  onChange={(e) => setConversionRatio(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsConversionModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createConversionMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createConversionMutation.isPending ? 'Saving...' : 'Set Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PRICING ================= */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-600" /> Set Party Price Matrix
              </h3>
              <button onClick={() => setIsPricingModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPricingMutation.mutate({
                  partyType: pricePartyType,
                  partyId: pricePartyId,
                  productId: priceProductId,
                  specialPrice: parseFloat(specialPrice) || 0,
                  minOrderQty: minOrderQty ? parseFloat(minOrderQty) : undefined,
                  discountPct: discountPct ? parseFloat(discountPct) : undefined,
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Party Type</label>
                  <select
                    value={pricePartyType}
                    onChange={(e) => setPricePartyType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="SUPPLIER">Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Special Discount %</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer / Client *</label>
                <select
                  required
                  value={pricePartyId}
                  onChange={(e) => setPricePartyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={priceProductId}
                  onChange={(e) => setPriceProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Special Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={specialPrice}
                    onChange={(e) => setSpecialPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Min Order Qty</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPricingMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createPricingMutation.isPending ? 'Saving...' : 'Set Special Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
