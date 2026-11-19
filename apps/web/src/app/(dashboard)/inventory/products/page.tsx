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
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  X,
  TrendingDown,
  Warehouse,
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
  purchasePrice: string | number;
  taxRate: string | number;
  minStockLevel: string | number;
  totalStock: string | number;
  isLowStock: boolean;
  category?: { id: string; name: string } | null;
  uom?: { id: string; name: string; symbol: string } | null;
  stockLevels: StockLevel[];
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form state
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

  // Fetch products
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

  // Fetch categories
  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/categories');
      return res.data;
    },
  });

  // Fetch UOMs
  const { data: uoms = [] } = useQuery<Array<{ id: string; name: string; symbol: string }>>({
    queryKey: ['inventory-uoms'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/uoms');
      return res.data;
    },
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<Array<{ id: string; name: string; code: string }>>({
    queryKey: ['inventory-warehouses'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/warehouses');
      return res.data;
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/inventory/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setModalError(err.message || err.response?.data?.message || 'Failed to create product. Check SKU uniqueness.');
    },
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
      type: 'GOODS',
      name: name.trim(),
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      hsnSacCode: hsnSacCode.trim() || undefined,
      categoryId: categoryId || undefined,
      uomId: uomId || undefined,
      sellingPrice: parseFloat(salePrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0,
      taxRate: parseFloat(taxRate) || 0,
      minStockLevel: parseFloat(minStockLevel) || 0,
    };

    const initialStockQty = parseFloat(openingStock);
    if (initialStockQty > 0) {
      if (!warehouseId) {
        setModalError('Please select a warehouse for opening stock.');
        return;
      }
      payload.openingStock = initialStockQty;
      payload.openingStockUnitCost = parseFloat(openingCost) || parseFloat(purchasePrice) || 0;
      payload.warehouseId = warehouseId;
      payload.openingWarehouseId = warehouseId;
    }

    createProductMutation.mutate(payload);
  };

  const lowStockCount = products.filter((p) => p.isLowStock).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Stock Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-warehouse stock control, automated reorder thresholds, and catalog management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inventory/transfers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" /> Transfer Stock
          </Link>
          <Link
            href="/inventory/adjustments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Stock Adjustment
          </Link>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* KPI & Alert Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Active Catalog</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{products.length} Items</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Configured Warehouses</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{warehouses.length} Units</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Warehouse className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`border rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition ${
            lowStockCount > 0
              ? 'bg-amber-50/60 border-amber-300 text-amber-900 hover:bg-amber-100/60'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <div className="text-xs font-semibold uppercase flex items-center gap-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              Low Stock Warnings
            </div>
            <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {lowStockCount} Products
            </div>
          </div>
          <span className="text-xs underline text-amber-700 font-semibold">
            {lowStockOnly ? 'Show All' : 'Filter Low Stock'}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
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

      {/* Product Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Category & Unit</th>
                <th className="py-3 px-4 text-right">Sale Price</th>
                <th className="py-3 px-4 text-right">Purchase Price</th>
                <th className="py-3 px-4 text-right">Tax Rate</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Threshold</th>
                <th className="py-3 px-4 text-center">Stock Status</th>
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
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No products found. Click "Add Product" to create your first stock item.
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const stock = parseFloat(item.totalStock.toString());
                  const minStock = parseFloat(item.minStockLevel?.toString() || '0');

                  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let badgeText = 'In Stock';

                  if (stock <= 0) {
                    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    badgeText = 'Out of Stock';
                  } else if (item.isLowStock) {
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
                        <div>{item.category?.name || 'Uncategorized'}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.uom?.name ? `${item.uom.name} (${item.uom.symbol})` : 'PCS'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium financial-figure">
                        {formatCurrency(item.salePrice.toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500 financial-figure">
                        {formatCurrency(item.purchasePrice.toString())}
                      </td>
                      <td className="py-3.5 px-4 text-right">{item.taxRate}%</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 text-sm">
                        {stock}{' '}
                        <span className="text-[11px] font-normal text-slate-500">
                          {item.uom?.symbol || 'PCS'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                        {minStock > 0 ? minStock : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeColor}`}
                        >
                          {badgeText === 'In Stock' && <CheckCircle2 className="w-3 h-3" />}
                          {badgeText === 'Low Stock' && <AlertTriangle className="w-3 h-3" />}
                          {badgeText === 'Out of Stock' && <TrendingDown className="w-3 h-3" />}
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add New Product to Inventory</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 overflow-y-auto space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product / Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ergonomic Office Chair"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU (Stock Keeping Unit)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="e.g. CHAIR-ERG-01"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={hsnSacCode}
                    onChange={(e) => setHsnSacCode(e.target.value)}
                    placeholder="e.g. 94013000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measurement (UOM)
                  </label>
                  <select
                    value={uomId}
                    onChange={(e) => setUomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Unit</option>
                    {uoms.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sale Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GST Tax Rate (%)
                  </label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                    <option value="28">28% (Luxury / Higher)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Alert Stock Level
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Initial Opening Stock Section */}
              <div className="pt-3 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-teal-600" />
                  Initial Opening Stock (Optional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Opening Quantity
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Cost per Unit (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingCost}
                      onChange={(e) => setOpeningCost(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Assign Warehouse
                    </label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {createProductMutation.isPending ? 'Saving Product...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
