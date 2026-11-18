'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Clock,
  Package,
  ShoppingCart,
  ShoppingBag,
  Download,
} from 'lucide-react';

export default function AnalyticsReportsPage() {
  const [activeTab, setActiveTab] = useState<'AR_AGING' | 'AP_AGING' | 'STOCK_VALUATION' | 'SALES_REGISTER' | 'PURCHASE_REGISTER'>('AR_AGING');

  // Fetch AR Aging
  const { data: arAging, isLoading: isArLoading } = useQuery<any>({
    queryKey: ['aging-receivables'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/aging/receivables');
      return res.data;
    },
  });

  // Fetch AP Aging
  const { data: apAging, isLoading: isApLoading } = useQuery<any>({
    queryKey: ['aging-payables'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/aging/payables');
      return res.data;
    },
  });

  // Fetch Stock Valuation
  const { data: stockValuation, isLoading: isStockLoading } = useQuery<any>({
    queryKey: ['stock-valuation-report'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/inventory/valuation');
      return res.data;
    },
  });

  // Fetch Sales Register
  const { data: salesRegister, isLoading: isSalesLoading } = useQuery<any>({
    queryKey: ['sales-register-report'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/registers/sales');
      return res.data;
    },
  });

  // Fetch Purchase Register
  const { data: purchaseRegister, isLoading: isPurchaseLoading } = useQuery<any>({
    queryKey: ['purchase-register-report'],
    queryFn: async () => {
      const res: any = await apiClient.get('/reports/registers/purchase');
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Debt aging analysis, stock asset valuation, and complete audit transaction registers
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" /> Export Statement
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('AR_AGING')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap border-b-2 ${
              activeTab === 'AR_AGING'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Receivables Aging (Debtors)
          </button>
          <button
            onClick={() => setActiveTab('AP_AGING')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap border-b-2 ${
              activeTab === 'AP_AGING'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payables Aging (Creditors)
          </button>
          <button
            onClick={() => setActiveTab('STOCK_VALUATION')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap border-b-2 ${
              activeTab === 'STOCK_VALUATION'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Stock Asset Valuation
          </button>
          <button
            onClick={() => setActiveTab('SALES_REGISTER')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap border-b-2 ${
              activeTab === 'SALES_REGISTER'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sales Register
          </button>
          <button
            onClick={() => setActiveTab('PURCHASE_REGISTER')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap border-b-2 ${
              activeTab === 'PURCHASE_REGISTER'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Purchase Register
          </button>
        </nav>
      </div>

      {/* AR AGING TAB */}
      {activeTab === 'AR_AGING' && (
        <div className="space-y-6">
          {/* Buckets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'current', title: 'Current / Not Due', data: arAging?.buckets?.current, color: 'text-emerald-700 bg-emerald-50' },
              { key: 'days1to30', title: '1 - 30 Days Overdue', data: arAging?.buckets?.days1to30, color: 'text-blue-700 bg-blue-50' },
              { key: 'days31to60', title: '31 - 60 Days Overdue', data: arAging?.buckets?.days31to60, color: 'text-amber-700 bg-amber-50' },
              { key: 'days61to90', title: '61 - 90 Days Overdue', data: arAging?.buckets?.days61to90, color: 'text-orange-700 bg-orange-50' },
              { key: 'days90Plus', title: '90+ Days Critical', data: arAging?.buckets?.days90Plus, color: 'text-rose-700 bg-rose-50' },
            ].map((b) => (
              <div key={b.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{b.title}</span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-1 financial-figure">
                  {formatCurrency(b.data?.amount || '0.00')}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{b.data?.invoiceCount || 0} Invoices</div>
              </div>
            ))}
          </div>

          {/* Detailed Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" /> Outstanding Customer Invoices by Aging Bucket
              </h3>
              <span className="text-xs text-slate-500 font-bold font-mono">
                Total Overdue: {formatCurrency(arAging?.totalOutstanding || '0.00')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Invoice Date</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-center">Days Overdue</th>
                    <th className="py-2.5 px-4 text-right">Total Invoice</th>
                    <th className="py-2.5 px-4 text-right">Pending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isArLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Loading aging analysis...</td>
                    </tr>
                  ) : (
                    ['current', 'days1to30', 'days31to60', 'days61to90', 'days90Plus'].flatMap((k) =>
                      (arAging?.buckets?.[k]?.invoices || []).map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-4 font-mono font-bold text-teal-700">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{inv.partyName}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono">{inv.date}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono">{inv.dueDate}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                inv.daysOverdue > 60
                                  ? 'bg-rose-100 text-rose-800'
                                  : inv.daysOverdue > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {inv.daysOverdue > 0 ? `${inv.daysOverdue} days` : 'Current'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(inv.totalAmount)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">
                            {formatCurrency(inv.dueAmount)}
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AP AGING TAB */}
      {activeTab === 'AP_AGING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'current', title: 'Current / Not Due', data: apAging?.buckets?.current },
              { key: 'days1to30', title: '1 - 30 Days Overdue', data: apAging?.buckets?.days1to30 },
              { key: 'days31to60', title: '31 - 60 Days Overdue', data: apAging?.buckets?.days31to60 },
              { key: 'days61to90', title: '61 - 90 Days Overdue', data: apAging?.buckets?.days61to90 },
              { key: 'days90Plus', title: '90+ Days Critical', data: apAging?.buckets?.days90Plus },
            ].map((b) => (
              <div key={b.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{b.title}</span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-1 financial-figure">
                  {formatCurrency(b.data?.amount || '0.00')}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{b.data?.invoiceCount || 0} Bills</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" /> Pending Supplier Bills by Aging Bucket
              </h3>
              <span className="text-xs text-slate-500 font-bold font-mono">
                Total Payables: {formatCurrency(apAging?.totalOutstanding || '0.00')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Bill #</th>
                    <th className="py-2.5 px-4">Supplier Name</th>
                    <th className="py-2.5 px-4">Bill Date</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-center">Days Overdue</th>
                    <th className="py-2.5 px-4 text-right">Total Bill</th>
                    <th className="py-2.5 px-4 text-right">Pending Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isApLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">Loading payables aging...</td>
                    </tr>
                  ) : (
                    ['current', 'days1to30', 'days31to60', 'days61to90', 'days90Plus'].flatMap((k) =>
                      (apAging?.buckets?.[k]?.invoices || []).map((bill: any) => (
                        <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{bill.invoiceNumber}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{bill.partyName}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono">{bill.date}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono">{bill.dueDate}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                bill.daysOverdue > 60
                                  ? 'bg-rose-100 text-rose-800'
                                  : bill.daysOverdue > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {bill.daysOverdue > 0 ? `${bill.daysOverdue} days` : 'Current'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(bill.totalAmount)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700 financial-figure">
                            {formatCurrency(bill.dueAmount)}
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STOCK VALUATION TAB */}
      {activeTab === 'STOCK_VALUATION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Inventory Asset Value</span>
              <div className="text-2xl font-bold font-mono text-teal-800 mt-1 financial-figure">
                {formatCurrency(stockValuation?.totalValuation || '0.00')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Physical Stock Units</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {stockValuation?.totalQuantity || '0'} Units
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Catalog SKU Count</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {stockValuation?.totalItems || 0} Products
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" /> Item-by-Item Stock Valuation Ledger
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Item & SKU</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-center">Unit</th>
                    <th className="py-2.5 px-4 text-right">Physical Quantity</th>
                    <th className="py-2.5 px-4 text-right">Purchase Unit Cost</th>
                    <th className="py-2.5 px-4 text-right">Extended Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isStockLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading valuation...</td>
                    </tr>
                  ) : (
                    stockValuation?.items?.map((item: any) => (
                      <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          <div>{item.name}</div>
                          {item.sku && <div className="text-[11px] font-mono text-slate-400">{item.sku}</div>}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{item.categoryName}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-500">{item.uom}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{item.totalQuantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(item.unitCost)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-teal-800 financial-figure">
                          {formatCurrency(item.totalValuation)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SALES REGISTER TAB */}
      {activeTab === 'SALES_REGISTER' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Official Chronological Sales Register
              </span>
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-500 mr-2">Total Turnover:</span>
              <span className="font-bold text-slate-900">{formatCurrency(salesRegister?.totalAmount || '0.00')}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Customer Name & GSTIN</th>
                    <th className="py-2.5 px-4 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-4 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">Gross Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isSalesLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">Loading sales register...</td>
                    </tr>
                  ) : (
                    salesRegister?.transactions?.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-mono text-slate-500">{t.date}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-teal-700">{t.documentNumber}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{t.partyName}</div>
                          {t.partyGstin && <div className="text-[10px] font-mono text-teal-800">{t.partyGstin}</div>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(t.taxableAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-blue-700 financial-figure">{formatCurrency(t.cgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-700 financial-figure">{formatCurrency(t.sgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-purple-700 financial-figure">{formatCurrency(t.igstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">{formatCurrency(t.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE REGISTER TAB */}
      {activeTab === 'PURCHASE_REGISTER' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Official Chronological Purchase Register
              </span>
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-500 mr-2">Total Purchases:</span>
              <span className="font-bold text-slate-900">{formatCurrency(purchaseRegister?.totalAmount || '0.00')}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Bill #</th>
                    <th className="py-2.5 px-4">Supplier Name & GSTIN</th>
                    <th className="py-2.5 px-4 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-4 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">Gross Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isPurchaseLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">Loading purchase register...</td>
                    </tr>
                  ) : (
                    purchaseRegister?.transactions?.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-mono text-slate-500">{t.date}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{t.documentNumber}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{t.partyName}</div>
                          {t.partyGstin && <div className="text-[10px] font-mono text-slate-500">{t.partyGstin}</div>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(t.taxableAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-blue-700 financial-figure">{formatCurrency(t.cgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-700 financial-figure">{formatCurrency(t.sgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-purple-700 financial-figure">{formatCurrency(t.igstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">{formatCurrency(t.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
