'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { PurchaseInvoiceDto } from '@bizflow/shared-types';
import { formatCurrency } from '@bizflow/shared-utils';
import { Plus, CheckCircle2 } from 'lucide-react';

export default function PurchaseBillsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: bills = [], isLoading } = useQuery<PurchaseInvoiceDto[]>({
    queryKey: ['purchase-bills', statusFilter],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchases/bills', {
        params: { status: statusFilter || undefined },
      });
      return res.data || [];
    },
  });

  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await apiClient.post(`/purchases/bills/${id}/post`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">DRAFT</span>;
      case 'POSTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">POSTED</span>;
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PAID</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Bills (Vendor Invoices)</h1>
          <p className="text-sm text-slate-500 mt-1">Record supplier purchases, track input tax credits, and manage payables</p>
        </div>

        <Link
          href="/purchases/bills/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Record Purchase Bill
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {['', 'DRAFT', 'POSTED', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st === '' ? 'All Bills' : st}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Bills: <span className="font-bold text-slate-900">{bills.length}</span>
        </div>
      </div>

      {/* Bills Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Bill # (Internal)</th>
                <th className="py-3.5 px-4">Vendor Bill #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Tax</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Due Payable</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Loading purchase bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No purchase bills recorded. Click <strong>Record Purchase Bill</strong> to add a vendor invoice.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {b.billNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {b.supplierBillNo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.supplierName || 'Supplier'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{new Date(b.billDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        Due: {new Date(b.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-3.5 px-4 text-right financial-figure text-slate-600">
                      {formatCurrency(b.subtotalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right financial-figure text-slate-600">
                      {formatCurrency(b.totalTaxAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right financial-figure font-bold text-slate-900">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right financial-figure font-bold text-red-600">
                      {formatCurrency(b.dueAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {b.status === 'DRAFT' && (
                        <button
                          onClick={() => postMutation.mutate(b.id)}
                          disabled={postMutation.isPending}
                          title="Post Bill (Assign Official Number)"
                          className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold inline-flex items-center gap-1 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Post Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
