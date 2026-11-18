'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import {
  Warehouse,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface TransferLineItem {
  id: string;
  productId: string;
  quantity: string;
}

export default function StockTransferPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<TransferLineItem[]>([
    { id: '1', productId: '', quantity: '1' },
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

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/inventory/stock/transfer', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      router.push('/inventory/movements');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Transfer failed. Check warehouse stock availability.');
    },
  });

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), productId: '', quantity: '1' },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof TransferLineItem, val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fromWarehouseId || !toWarehouseId) {
      setErrorMessage('Please select both source and destination warehouses.');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setErrorMessage('Source and destination warehouses cannot be the same.');
      return;
    }

    const validItems = items.filter(
      (item) => item.productId && parseFloat(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setErrorMessage('Please select at least one valid product and quantity to transfer.');
      return;
    }

    const payload = {
      fromWarehouseId,
      toWarehouseId,
      transferDate: new Date().toISOString(),
      notes: notes.trim() || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity),
      })),
    };

    transferMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inter-Warehouse Stock Transfer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Safely dispatch and receive inventory between physical business warehouse locations
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
        {/* Warehouse Selection Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-rose-600" /> Source Dispatch Warehouse *
            </label>
            <select
              required
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select Origin Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-teal-600" /> Destination Receiving Warehouse *
            </label>
            <select
              required
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select Target Warehouse</option>
              {warehouses
                .filter((w) => w.id !== fromWarehouseId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Transfer Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-600" /> Products to Transfer
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
                  <th className="py-2.5 px-3 w-40 text-right">Transfer Quantity</th>
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
                      <input
                        type="number"
                        step="1"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md text-right font-mono outline-none focus:ring-2 focus:ring-teal-500"
                      />
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
        </div>

        {/* Notes & Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Dispatch Notes / Vehicle / Tracking Info (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Van MH-12-AB-1234 dispatch for regional store replenishment"
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
            disabled={transferMutation.isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {transferMutation.isPending ? (
              'Executing Transfer...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Execute Stock Transfer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
