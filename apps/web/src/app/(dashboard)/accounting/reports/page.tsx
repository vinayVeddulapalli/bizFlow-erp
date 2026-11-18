'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  TrendingUp,
  TrendingDown,
  Building,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<'TRIAL_BALANCE' | 'PNL' | 'BALANCE_SHEET'>('TRIAL_BALANCE');

  // Fetch Trial Balance
  const { data: trialBalance, isLoading: isTbLoading } = useQuery<any>({
    queryKey: ['trial-balance'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/trial-balance');
      return res.data;
    },
  });

  // Fetch P&L
  const { data: pnl, isLoading: isPnlLoading } = useQuery<any>({
    queryKey: ['profit-loss'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/profit-loss');
      return res.data;
    },
  });

  // Fetch Balance Sheet
  const { data: balanceSheet, isLoading: isBsLoading } = useQuery<any>({
    queryKey: ['balance-sheet'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/balance-sheet');
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Statements & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time double-entry financial statements computed directly from general ledger postings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/accounting/journals"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            Journal Entries
          </Link>
          <Link
            href="/gst/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> GST Reports (GSTR-1 / 3B)
          </Link>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('TRIAL_BALANCE')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === 'TRIAL_BALANCE'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Trial Balance
          </button>
          <button
            onClick={() => setActiveTab('PNL')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === 'PNL'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Profit & Loss (Income Statement)
          </button>
          <button
            onClick={() => setActiveTab('BALANCE_SHEET')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              activeTab === 'BALANCE_SHEET'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Balance Sheet
          </button>
        </nav>
      </div>

      {/* TAB 1: TRIAL BALANCE */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ledger Equilibrium Check
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every transaction adheres to the fundamental equation: Total Debits = Total Credits
              </p>
            </div>

            <div>
              {trialBalance?.isBalanced ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Trial Balance in Equilibrium
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Imbalance Detected
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-28">Code</th>
                  <th className="py-3 px-4">Account Title</th>
                  <th className="py-3 px-4 w-28">Classification</th>
                  <th className="py-3 px-4 w-36 text-right">Debit Balance (₹)</th>
                  <th className="py-3 px-4 w-36 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isTbLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      Computing trial balance...
                    </td>
                  </tr>
                ) : (
                  trialBalance?.accounts
                    .filter((a: any) => parseFloat(a.debit) > 0 || parseFloat(a.credit) > 0)
                    .map((acc: any) => (
                      <tr key={acc.accountId} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{acc.code}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{acc.name}</td>
                        <td className="py-2.5 px-4 text-[10px] font-semibold uppercase text-slate-500">
                          {acc.category}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 financial-figure">
                          {parseFloat(acc.debit) > 0 ? formatCurrency(acc.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 financial-figure">
                          {parseFloat(acc.credit) > 0 ? formatCurrency(acc.credit) : '-'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs text-slate-900 font-mono">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase text-slate-800">
                    Grand Totals (Debits & Credits)
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-teal-800 financial-figure">
                    {formatCurrency(trialBalance?.totalDebit || '0.00')}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-teal-800 financial-figure">
                    {formatCurrency(trialBalance?.totalCredit || '0.00')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS STATEMENT */}
      {activeTab === 'PNL' && (
        <div className="space-y-6">
          {/* PNL Net Result Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Net Operating Performance
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Period: Current Indian Financial Year (April 1 to Present)
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500">Net Profit / (Loss)</div>
                <div
                  className={`text-2xl font-bold font-mono financial-figure ${
                    parseFloat(pnl?.netProfit || '0') >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(pnl?.netProfit || '0.00')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Column */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                    Operating Revenue (Income)
                  </h3>
                </div>
                <div className="font-mono font-bold text-xs text-emerald-800">
                  {formatCurrency(pnl?.totalRevenue || '0.00')}
                </div>
              </div>

              <div className="p-4 flex-1">
                {isPnlLoading ? (
                  <div className="py-6 text-center text-slate-400 text-xs">Loading revenue accounts...</div>
                ) : pnl?.revenueAccounts?.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No revenue entries recorded.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pnl?.revenueAccounts?.map((acc: any) => (
                      <div key={acc.accountId} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-slate-400 mr-2">{acc.code}</span>
                          <span className="font-semibold text-slate-800">{acc.name}</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(acc.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expense Column */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-rose-900">
                    Operating Expenses & COGS
                  </h3>
                </div>
                <div className="font-mono font-bold text-xs text-rose-800">
                  {formatCurrency(pnl?.totalExpense || '0.00')}
                </div>
              </div>

              <div className="p-4 flex-1">
                {isPnlLoading ? (
                  <div className="py-6 text-center text-slate-400 text-xs">Loading expense accounts...</div>
                ) : pnl?.expenseAccounts?.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No expense entries recorded.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pnl?.expenseAccounts?.map((acc: any) => (
                      <div key={acc.accountId} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-slate-400 mr-2">{acc.code}</span>
                          <span className="font-semibold text-slate-800">{acc.name}</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(acc.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          {/* Balance Sheet Parity Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Balance Sheet Accounting Equation
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Assets ({formatCurrency(balanceSheet?.totalAssets || '0')}) = Liabilities & Equity ({formatCurrency(balanceSheet?.totalLiabilitiesAndEquity || '0')})
              </div>
            </div>

            <div>
              {balanceSheet?.isBalanced ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Perfectly Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Equation Imbalance
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ASSETS */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900">
                    Total Business Assets
                  </h3>
                </div>
                <div className="font-mono font-bold text-sm text-blue-800">
                  {formatCurrency(balanceSheet?.totalAssets || '0.00')}
                </div>
              </div>

              <div className="p-4 flex-1">
                {isBsLoading ? (
                  <div className="py-6 text-center text-slate-400 text-xs">Computing assets...</div>
                ) : balanceSheet?.assetAccounts?.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No active asset accounts.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {balanceSheet?.assetAccounts?.map((acc: any) => (
                      <div key={acc.accountId} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-slate-400 mr-2">{acc.code}</span>
                          <span className="font-semibold text-slate-800">{acc.name}</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(acc.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                    Total Liabilities
                  </h3>
                  <div className="font-mono font-bold text-sm text-amber-800">
                    {formatCurrency(balanceSheet?.totalLiabilities || '0.00')}
                  </div>
                </div>

                <div className="p-4">
                  {balanceSheet?.liabilityAccounts?.length === 0 ? (
                    <div className="py-3 text-center text-slate-400 text-xs">No liabilities recorded.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {balanceSheet?.liabilityAccounts?.map((acc: any) => (
                        <div key={acc.accountId} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-slate-400 mr-2">{acc.code}</span>
                            <span className="font-semibold text-slate-800">{acc.name}</span>
                          </div>
                          <div className="font-mono font-bold text-slate-900">
                            {formatCurrency(acc.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Equity */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-purple-900">
                    Owner's Equity & Retained Earnings
                  </h3>
                  <div className="font-mono font-bold text-sm text-purple-800">
                    {formatCurrency(balanceSheet?.totalEquity || '0.00')}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="divide-y divide-slate-100">
                    {balanceSheet?.equityAccounts?.map((acc: any) => (
                      <div key={acc.accountId} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-slate-400 mr-2">{acc.code}</span>
                          <span className="font-semibold text-slate-800">{acc.name}</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(acc.amount)}
                        </div>
                      </div>
                    ))}
                    <div className="py-2 flex items-center justify-between text-xs font-semibold text-purple-900 bg-purple-50/40 px-2 rounded">
                      <span>Current Period Net Profit (from P&L)</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(balanceSheet?.retainedEarnings || '0.00')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
