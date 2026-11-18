'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import {
  Layers,
  Warehouse,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface AdjustmentLineItem {
  id: string;
  productId: string;
  quantity: string;
}

export default function StockAdjustmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [warehouseId, setWarehouseId] = useState('');
  const [reason, setReason] = useState('PHYSICAL_COUNT_DISCREPANCY');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<AdjustmentLineItem[]>([
    { id: '1', productId: '', quantity: '0' },
  ]);

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<Array<{ id: string; name: string; code: string }>>({
    queryKey: ['inventory-warehouses'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/stock/warehouses');
      return res.data;
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery<Array<{ id: string; name: string; sku: string | null }>>({
    queryKey: ['products-list-minimal'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/products');
      return res.data;
    },
  });

  // Adjustment mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/inventory/stock/adjustment', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/inventory/movements');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Adjustment failed.');
    },
  });

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), productId: '', quantity: '0' },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof AdjustmentLineItem, val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!warehouseId) {
      setErrorMessage('Please select a warehouse where reconciliation took place.');
      return;
    }

    const validItems = items.filter(
      (item) => item.productId && parseFloat(item.quantity) !== 0
    );

    if (validItems.length === 0) {
      setErrorMessage('Please add at least one product with a non-zero adjustment quantity (+/-).');
      return;
    }

    const payload = {
      warehouseId,
      reason,
      adjustmentDate: new Date().toISOString(),
      notes: notes.trim() || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity),
      })),
    };

    adjustmentMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Adjustment & Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile physical inventory counts, record write-offs, damages, or found stock
          </p>
        </div>

        <Link
          href="/inventory/movements"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
        >
          View Movement Ledger
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
        {/* Warehouse and Reason Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-teal-600" /> Target Warehouse *
            </label>
            <select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select Warehouse for Audit</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" /> Adjustment Reason *
            </label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="PHYSICAL_COUNT_DISCREPANCY">Physical Count Discrepancy (Periodic Audit)</option>
              <option value="DAMAGED">Damaged Goods / Broken in Warehouse</option>
              <option value="SPOILED">Spoiled / Expired Inventory</option>
              <option value="THEFT">Shrinkage / Unaccounted Loss</option>
              <option value="FOUND_STOCK">Found / Unregistered Inventory (+)</option>
            </select>
          </div>
        </div>

        {/* Adjustment Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-600" /> Reconciled Products
            </h3>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Item
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Item / Product</th>
                  <th className="py-2.5 px-3 w-48 text-right">Adjustment Quantity (+ / -)</th>
                  <th className="py-2.5 px-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Choose Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(SKU: ${p.sku})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="1"
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          placeholder="e.g. -2 or +5"
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-right font-mono outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            Note: Enter negative values (e.g. <span className="font-mono text-rose-600">-3</span>) for write-offs/shrinkage, or positive values (e.g. <span className="font-mono text-emerald-600">+5</span>) for found stock.
          </p>
        </div>

        {/* Audit Memo */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Audit Memo / Stock Verification Report Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Q4 physical warehouse audit discrepancy verified by warehouse manager"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <Link
            href="/inventory/products"
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={adjustmentMutation.isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {adjustmentMutation.isPending ? (
              'Recording Adjustment...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Save Stock Adjustment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
