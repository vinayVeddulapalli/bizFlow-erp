'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Filter,
  Package,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface MovementItem {
  id: string;
  movementType: string;
  quantity: string | number;
  unitCost: string | number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string | null; uom?: { symbol: string } | null };
  warehouse: { id: string; name: string; code: string };
}

export default function StockMovementsPage() {
  const [movementFilter, setMovementFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Fetch stock movements
  const { data: movements = [], isLoading } = useQuery<MovementItem[]>({
    queryKey: ['stock-movements', movementFilter, warehouseFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (movementFilter) params.append('movementType', movementFilter);
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      const res: any = await apiClient.get(`/inventory/stock/movements?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<Array<{ id: string; name: string; code: string }>>({
    queryKey: ['inventory-warehouses'],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/stock/warehouses');
      return res.data;
    },
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'SALES_INVOICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Sales Dispatch
          </span>
        );
      case 'PURCHASE_RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Vendor Receipt
          </span>
        );
      case 'TRANSFER_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowRightLeft className="w-3 h-3 text-blue-600" /> Transfer In
          </span>
        );
      case 'TRANSFER_OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ArrowRightLeft className="w-3 h-3 text-indigo-600" /> Transfer Out
          </span>
        );
      case 'STOCK_ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3 h-3 text-purple-600" /> Adjustment
          </span>
        );
      case 'OPENING_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Package className="w-3 h-3 text-slate-600" /> Opening Stock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movement Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit log of every stock inbound, outbound, transfer, and adjustment transaction
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inventory/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Package className="w-3.5 h-3.5 text-slate-500" /> Products Catalog
          </Link>
          <Link
            href="/inventory/transfers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> New Stock Transfer
          </Link>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Movement Types</option>
            <option value="PURCHASE_RECEIPT">Vendor Receipts (In)</option>
            <option value="SALES_INVOICE">Sales Dispatches (Out)</option>
            <option value="TRANSFER_IN">Warehouse Transfers In</option>
            <option value="TRANSFER_OUT">Warehouse Transfers Out</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustments</option>
            <option value="OPENING_STOCK">Opening Stock</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {movements.length} audit entries
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Activity Type</th>
                <th className="py-3 px-4 text-right">Quantity Impact</th>
                <th className="py-3 px-4 text-right">Unit Valuation</th>
                <th className="py-3 px-4">Reference / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Loading stock ledger entries...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No stock movements recorded yet. Inbound purchases, sales dispatches, and transfers will appear here.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const qty = parseFloat(m.quantity?.toString() || '0');
                  const isPositive = qty > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        <div>{new Date(m.createdAt).toLocaleDateString()}</div>
                        <div className="text-slate-400">{new Date(m.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{m.product.name}</div>
                        {m.product.sku && (
                          <div className="text-[11px] text-slate-400 font-mono font-normal">
                            SKU: {m.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{m.warehouse.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({m.warehouse.code})</span>
                      </td>
                      <td className="py-3.5 px-4">{getMovementBadge(m.movementType)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${qty}` : qty}{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            {m.product.uom?.symbol || 'PCS'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(m.unitCost?.toString() || '0')}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                        {m.referenceId && (
                          <div className="font-mono text-slate-700 font-semibold">
                            Ref: {m.referenceId}
                          </div>
                        )}
                        {m.notes && <div className="text-slate-400 truncate">{m.notes}</div>}
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
  );
}
