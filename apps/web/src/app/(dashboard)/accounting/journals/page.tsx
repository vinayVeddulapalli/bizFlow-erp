'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency, toDecimal } from '@bizflow/shared-utils';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Scale,
  Receipt,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface JournalLineForm {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

interface JournalEntryItem {
  id: string;
  entryNumber: string;
  entryDate: string;
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  narration: string;
  totalDebit: string | number;
  totalCredit: string | number;
  createdAt: string;
  lines: Array<{
    id: string;
    debit: string | number;
    credit: string | number;
    description: string | null;
    account: { id: string; code: string; name: string; category: string };
  }>;
}

export default function JournalEntriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<JournalLineForm[]>([
    { id: '1', accountId: '', debit: '0', credit: '0', description: '' },
    { id: '2', accountId: '', debit: '0', credit: '0', description: '' },
  ]);

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery<JournalEntryItem[]>({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/journals');
      return res.data;
    },
  });

  // Fetch accounts list
  const { data: accounts = [] } = useQuery<Array<{ id: string; code: string; name: string; category: string }>>({
    queryKey: ['chart-of-accounts-minimal'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts');
      return res.data;
    },
  });

  // Create journal mutation
  const createJournalMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/accounting/journals', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || 'Failed to post journal entry.');
    },
  });

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setNarration('');
    setLines([
      { id: '1', accountId: '', debit: '0', credit: '0', description: '' },
      { id: '2', accountId: '', debit: '0', credit: '0', description: '' },
    ]);
    setModalError('');
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), accountId: '', debit: '0', credit: '0', description: '' },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLineForm, val: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
  };

  // Live balancing calculation
  let totalDebit = toDecimal(0);
  let totalCredit = toDecimal(0);
  for (const l of lines) {
    totalDebit = totalDebit.plus(parseFloat(l.debit) || 0);
    totalCredit = totalCredit.plus(parseFloat(l.credit) || 0);
  }
  const diff = totalDebit.minus(totalCredit).abs();
  const isBalanced = diff.lte(0.001) && totalDebit.gt(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!isBalanced) {
      setModalError('Journal entry must be balanced. Total Debits must strictly equal Total Credits.');
      return;
    }

    if (!narration.trim()) {
      setModalError('Narration / Description is required.');
      return;
    }

    const validLines = lines.filter(
      (l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
    );

    if (validLines.length < 2) {
      setModalError('At least 2 valid line items with non-zero debits/credits are required.');
      return;
    }

    createJournalMutation.mutate({
      entryDate,
      narration: narration.trim(),
      referenceType: 'MANUAL',
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description.trim() || undefined,
      })),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">General Journal Vouchers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete double-entry accounting ledger with server-verified debit & credit balancing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/accounting/chart-of-accounts"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Chart of Accounts
          </Link>
          <Link
            href="/accounting/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Scale className="w-3.5 h-3.5 text-slate-500" /> Trial Balance
          </Link>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> New Journal Voucher
          </button>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-32">Voucher #</th>
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4 w-32">Source / Type</th>
                <th className="py-3 px-4">Narration & Line Accounts</th>
                <th className="py-3 px-4 w-28 text-right">Debit (₹)</th>
                <th className="py-3 px-4 w-28 text-right">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading journal vouchers...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No journal entries found. Sales invoices, purchase bills, and manual vouchers will appear here.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {entry.entryNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Receipt className="w-3 h-3 text-slate-500" />
                        {entry.referenceType || 'MANUAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{entry.narration}</div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-2">
                        {entry.lines.map((l) => (
                          <span
                            key={l.id}
                            className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono text-[10px]"
                          >
                            {l.account.name}: {parseFloat(l.debit.toString()) > 0 ? `Dr ₹${l.debit}` : `Cr ₹${l.credit}`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">
                      {formatCurrency(entry.totalDebit.toString())}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">
                      {formatCurrency(entry.totalCredit.toString())}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Journal Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Create Manual Journal Voucher</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voucher Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Narration / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accrued electricity expense for head office"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Multi-Line Debit / Credit Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Journal Lines (Double-Entry Debit & Credit)
                  </span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3 w-36 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-3 w-36 text-right">Credit (₹)</th>
                        <th className="py-2.5 px-3">Line Memo</th>
                        <th className="py-2.5 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((l) => (
                        <tr key={l.id}>
                          <td className="p-2">
                            <select
                              required
                              value={l.accountId}
                              onChange={(e) => updateLine(l.id, 'accountId', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">Select Account</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name} ({acc.category})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={l.debit}
                              onChange={(e) => {
                                updateLine(l.id, 'debit', e.target.value);
                                if (parseFloat(e.target.value) > 0) {
                                  updateLine(l.id, 'credit', '0');
                                }
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded text-right font-mono outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={l.credit}
                              onChange={(e) => {
                                updateLine(l.id, 'credit', e.target.value);
                                if (parseFloat(e.target.value) > 0) {
                                  updateLine(l.id, 'debit', '0');
                                }
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded text-right font-mono outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Optional line memo"
                              value={l.description}
                              onChange={(e) => updateLine(l.id, 'description', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(l.id)}
                              disabled={lines.length <= 2}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Double-Entry HUD Real-Time Balancer */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-6 font-mono">
                    <div>
                      <span className="text-slate-500">Total Debit: </span>
                      <span className="font-bold text-slate-900">{formatCurrency(totalDebit.toFixed(2))}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Credit: </span>
                      <span className="font-bold text-slate-900">{formatCurrency(totalCredit.toFixed(2))}</span>
                    </div>
                  </div>

                  <div>
                    {isBalanced ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Perfectly Balanced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Imbalance: {formatCurrency(diff.toFixed(2))}
                      </span>
                    )}
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
                  disabled={!isBalanced || createJournalMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {createJournalMutation.isPending ? 'Posting Voucher...' : 'Post Journal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
