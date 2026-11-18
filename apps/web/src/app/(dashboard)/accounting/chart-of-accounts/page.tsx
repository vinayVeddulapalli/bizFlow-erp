'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  X,
  Building,
  TrendingUp,
  TrendingDown,
  Layers,
  Scale,
} from 'lucide-react';
import Link from 'next/link';

interface AccountItem {
  id: string;
  code: string;
  name: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  isSystem: boolean;
  isActive: boolean;
  currentBalance: string | number;
}

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'>('EXPENSE');
  const [openingBalance, setOpeningBalance] = useState('0');

  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery<AccountItem[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts');
      return res.data;
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/accounting/accounts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || 'Failed to create ledger account.');
    },
  });

  const resetForm = () => {
    setCode('');
    setName('');
    setCategory('EXPENSE');
    setOpeningBalance('0');
    setModalError('');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!code.trim() || !name.trim()) {
      setModalError('Account code and name are required.');
      return;
    }

    createAccountMutation.mutate({
      code: code.trim(),
      name: name.trim(),
      category,
      openingBalance: parseFloat(openingBalance) || 0,
    });
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.includes(searchTerm);
    const matchesCategory =
      selectedCategory === 'ALL' || acc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'ASSET':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">ASSET</span>;
      case 'LIABILITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">LIABILITY</span>;
      case 'EQUITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">EQUITY</span>;
      case 'REVENUE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">REVENUE</span>;
      case 'EXPENSE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">EXPENSE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            General ledger master accounts for double-entry financial accounting and taxation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/accounting/journals"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Journal Entries
          </Link>
          <Link
            href="/accounting/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Scale className="w-3.5 h-3.5 text-slate-500" /> Financial Statements
          </Link>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add Ledger Account
          </button>
        </div>
      </div>

      {/* Category Pills & Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'ALL', label: 'All Accounts', count: accounts.length, icon: Layers, color: 'text-slate-700 bg-slate-100' },
          { key: 'ASSET', label: 'Assets', count: accounts.filter((a) => a.category === 'ASSET').length, icon: Building, color: 'text-blue-700 bg-blue-50' },
          { key: 'LIABILITY', label: 'Liabilities', count: accounts.filter((a) => a.category === 'LIABILITY').length, icon: TrendingDown, color: 'text-amber-800 bg-amber-50' },
          { key: 'EQUITY', label: 'Equity', count: accounts.filter((a) => a.category === 'EQUITY').length, icon: Scale, color: 'text-purple-700 bg-purple-50' },
          { key: 'REVENUE', label: 'Revenue', count: accounts.filter((a) => a.category === 'REVENUE').length, icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedCategory(item.key)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              selectedCategory === item.key
                ? 'bg-white border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">{item.label}</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{item.count}</div>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search account code (e.g. 1110) or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
          Showing {filteredAccounts.length} accounts
        </span>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-28">Account Code</th>
                <th className="py-3 px-4">Account Title / Name</th>
                <th className="py-3 px-4 w-32">Classification</th>
                <th className="py-3 px-4 w-28 text-center">System Lock</th>
                <th className="py-3 px-4 text-right">Current Ledger Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No accounts found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const bal = parseFloat(acc.currentBalance.toString());
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {acc.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {acc.name}
                      </td>
                      <td className="py-3.5 px-4">{getCategoryBadge(acc.category)}</td>
                      <td className="py-3.5 px-4 text-center">
                        {acc.isSystem ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-slate-400" /> System
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Custom</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm financial-figure text-slate-900">
                        {formatCurrency(bal.toFixed(2))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add New General Ledger Account</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5910"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Subscriptions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Classification *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ASSET">ASSET (Cash, Receivables, Stock, Fixed Assets)</option>
                  <option value="LIABILITY">LIABILITY (Payables, Taxes Payable, Loans)</option>
                  <option value="EQUITY">EQUITY (Capital, Retained Earnings)</option>
                  <option value="REVENUE">REVENUE (Sales, Services, Interest)</option>
                  <option value="EXPENSE">EXPENSE (Purchases, Rent, Salaries, Bills)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

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
                  disabled={createAccountMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {createAccountMutation.isPending ? 'Saving Account...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
