'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Receipt,
  Download,
  Building,
  TrendingUp,
  Percent,
} from 'lucide-react';

export default function GstReportsPage() {
  const [activeTab, setActiveTab] = useState<'GSTR1' | 'GSTR3B'>('GSTR1');

  // Fetch GSTR-1
  const { data: gstr1, isLoading: isGstr1Loading } = useQuery<any>({
    queryKey: ['gstr1-report'],
    queryFn: async () => {
      const res: any = await apiClient.get('/gst/reports/gstr1');
      return res.data;
    },
  });

  // Fetch GSTR-3B
  const { data: gstr3b } = useQuery<any>({
    queryKey: ['gstr3b-report'],
    queryFn: async () => {
      const res: any = await apiClient.get('/gst/reports/gstr3b');
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">GST & Taxation Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated Indian Goods & Services Tax preparation: GSTR-1 outward supplies & GSTR-3B monthly computation
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" /> Export Tax Summary
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('GSTR1')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === 'GSTR1'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            GSTR-1 Outward Supplies Summary
          </button>
          <button
            onClick={() => setActiveTab('GSTR3B')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === 'GSTR3B'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            GSTR-3B Tax Liability & ITC Offset
          </button>
        </nav>
      </div>

      {/* GSTR-1 TAB */}
      {activeTab === 'GSTR1' && (
        <div className="space-y-6">
          {/* Tax Totals KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Taxable Value</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1 financial-figure">
                {formatCurrency(gstr1?.totals?.taxableAmount || '0.00')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Central Tax (CGST)</span>
              <div className="text-xl font-bold font-mono text-blue-700 mt-1 financial-figure">
                {formatCurrency(gstr1?.totals?.cgstAmount || '0.00')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">State Tax (SGST)</span>
              <div className="text-xl font-bold font-mono text-indigo-700 mt-1 financial-figure">
                {formatCurrency(gstr1?.totals?.sgstAmount || '0.00')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Integrated Tax (IGST)</span>
              <div className="text-xl font-bold font-mono text-purple-700 mt-1 financial-figure">
                {formatCurrency(gstr1?.totals?.igstAmount || '0.00')}
              </div>
            </div>
          </div>

          {/* Table 4: B2B Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Table 4: B2B Invoices (Supplies to Registered Taxpayers)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {gstr1?.b2b?.length || 0} Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Buyer GSTIN & Name</th>
                    <th className="py-2.5 px-4">POS</th>
                    <th className="py-2.5 px-4 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-4 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isGstr1Loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">Loading B2B data...</td>
                    </tr>
                  ) : gstr1?.b2b?.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">No B2B invoices recorded with valid GSTINs.</td>
                    </tr>
                  ) : (
                    gstr1?.b2b?.map((row: any) => (
                      <tr key={row.invoiceNumber} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-teal-700">{row.invoiceNumber}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{row.invoiceDate}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{row.customerName}</div>
                          <div className="font-mono text-[11px] text-teal-800 font-bold">{row.customerGstin}</div>
                        </td>
                        <td className="py-2.5 px-4 font-mono">{row.placeOfSupply}</td>
                        <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(row.taxableAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-blue-700 financial-figure">{formatCurrency(row.cgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-700 financial-figure">{formatCurrency(row.sgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-purple-700 financial-figure">{formatCurrency(row.igstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">{formatCurrency(row.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 12: HSN Summary */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Table 12: HSN/SAC Summary of Outward Supplies
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {gstr1?.hsnSummary?.length || 0} Tariff Lines
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">HSN/SAC</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center">UQC</th>
                    <th className="py-2.5 px-4 text-right">Total Quantity</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-2.5 px-4 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isGstr1Loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">Loading HSN breakdown...</td>
                    </tr>
                  ) : gstr1?.hsnSummary?.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">No HSN tariff records found.</td>
                    </tr>
                  ) : (
                    gstr1?.hsnSummary?.map((hsn: any) => (
                      <tr key={hsn.hsnSacCode} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{hsn.hsnSacCode}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{hsn.description}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-500">{hsn.uqc}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{hsn.totalQuantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono financial-figure">{formatCurrency(hsn.taxableAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-blue-700 financial-figure">{formatCurrency(hsn.cgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-700 financial-figure">{formatCurrency(hsn.sgstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-purple-700 financial-figure">{formatCurrency(hsn.igstAmount)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">{formatCurrency(hsn.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GSTR-3B TAB */}
      {activeTab === 'GSTR3B' && (
        <div className="space-y-6">
          {/* Net Tax Liability Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Net Monthly Tax Payable (After ITC Offset)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Output Tax Liability ({formatCurrency(gstr3b?.outwardSupplies?.totalTax || '0')}) minus Eligible ITC ({formatCurrency(gstr3b?.eligibleItc?.totalItc || '0')})
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Net Tax Payable to Government</div>
              <div
                className={`text-2xl font-bold font-mono financial-figure ${
                  parseFloat(gstr3b?.netTaxPayable?.totalPayable || '0') > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(gstr3b?.netTaxPayable?.totalPayable || '0.00')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Table 3.1: Outward Supplies Liability */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    3.1 Outward Taxable Supplies (Tax Liability)
                  </h3>
                </div>
                <div className="font-mono font-bold text-xs text-slate-900">
                  {formatCurrency(gstr3b?.outwardSupplies?.totalTax || '0.00')}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Total Taxable Turnover</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(gstr3b?.outwardSupplies?.taxableAmount || '0.00')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600">Integrated Tax (IGST)</span>
                  <span className="font-mono font-bold text-purple-700">
                    {formatCurrency(gstr3b?.outwardSupplies?.igstAmount || '0.00')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600">Central Tax (CGST)</span>
                  <span className="font-mono font-bold text-blue-700">
                    {formatCurrency(gstr3b?.outwardSupplies?.cgstAmount || '0.00')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600">State Tax (SGST)</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {formatCurrency(gstr3b?.outwardSupplies?.sgstAmount || '0.00')}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4: Eligible ITC Available */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    4. Eligible Input Tax Credit (ITC from Purchases)
                  </h3>
                </div>
                <div className="font-mono font-bold text-xs text-emerald-700">
                  {formatCurrency(gstr3b?.eligibleItc?.totalItc || '0.00')}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Total Available Credit (Purchases)</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(gstr3b?.eligibleItc?.totalItc || '0.00')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600">ITC - Integrated Tax (IGST)</span>
                  <span className="font-mono font-bold text-purple-700">
                    {formatCurrency(gstr3b?.eligibleItc?.igstAmount || '0.00')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600">ITC - Central Tax (CGST)</span>
                  <span className="font-mono font-bold text-blue-700">
                    {formatCurrency(gstr3b?.eligibleItc?.cgstAmount || '0.00')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600">ITC - State Tax (SGST)</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {formatCurrency(gstr3b?.eligibleItc?.sgstAmount || '0.00')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
