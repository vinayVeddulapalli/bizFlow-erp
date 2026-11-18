'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { SalesInvoiceDto } from '@bizflow/shared-types';
import { formatCurrency } from '@bizflow/shared-utils';
import { Plus, Printer, CheckCircle2, XCircle } from 'lucide-react';

export default function SalesInvoicesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: invoices = [], isLoading } = useQuery<SalesInvoiceDto[]>({
    queryKey: ['sales-invoices', statusFilter],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices', {
        params: { status: statusFilter || undefined },
      });
      return res.data || [];
    },
  });

  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await apiClient.post(`/sales/invoices/${id}/post`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await apiClient.post(`/sales/invoices/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">DRAFT</span>;
      case 'POSTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">POSTED</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">PARTIAL</span>;
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PAID</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">CANCELLED</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create tax invoices, compute GST distributions, and record customer payments
          </p>
        </div>

        <Link
          href="/sales/invoices/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Create Sales Invoice
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {['', 'DRAFT', 'POSTED', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st === '' ? 'All Invoices' : st}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Invoices: <span className="font-bold text-slate-900">{invoices.length}</span>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Tax Total</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading sales invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No sales invoices found. Click <strong>Create Sales Invoice</strong> to start billing.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inv.customerName || 'Customer'}</div>
                      {inv.customerGstin && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          GSTIN: {inv.customerGstin}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{new Date(inv.invoiceDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        Due: {new Date(inv.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 text-right financial-figure text-slate-600">
                      {formatCurrency(inv.subtotalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right financial-figure text-slate-600">
                      {formatCurrency(inv.totalTaxAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right financial-figure font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right financial-figure font-bold text-red-600">
                      {formatCurrency(inv.dueAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => postMutation.mutate(inv.id)}
                            disabled={postMutation.isPending}
                            title="Post Invoice (Assign Official Number)"
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        <a
                          href={`http://localhost:4000/api/v1/sales/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="View / Print Tax Invoice"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          <Printer className="w-4 h-4" />
                        </a>

                        {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                          <button
                            onClick={() => cancelMutation.mutate(inv.id)}
                            disabled={cancelMutation.isPending}
                            title="Cancel Invoice"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
