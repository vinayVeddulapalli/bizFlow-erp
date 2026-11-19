'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Wallet,
  Plus,
  Search,
  X,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Repeat,
  Layers,
} from 'lucide-react';

interface ExpenseItem {
  id: string;
  voucherNumber: string;
  expenseDate: string;
  amount: number | string;
  isGstClaimable: boolean;
  vendorName: string | null;
  vendorGstin: string | null;
  gstRate: number | string | null;
  cgstAmount: number | string;
  sgstAmount: number | string;
  igstAmount: number | string;
  paymentMode: string;
  isRecurring: boolean;
  recurrenceUnit: string | null;
  notes: string | null;
  category: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface OtherIncomeItem {
  id: string;
  voucherNumber: string;
  incomeDate: string;
  amount: number | string;
  source: string | null;
  paymentMode: string;
  notes: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface ExpenseCategoryItem {
  id: string;
  name: string;
  code: string | null;
  isTaxDeductible: boolean;
}

interface FinancialOverview {
  totalExpense: string;
  totalGstClaimable: string;
  totalItcAmount: string;
  totalOtherIncome: string;
  netOperatingExpense: string;
  topCategory: string;
  topCategoryAmount: string;
  expenseCount: number;
  incomeCount: number;
  recurringCount: number;
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'expenses' | 'income' | 'categories'>('expenses');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [gstOnlyFilter, setGstOnlyFilter] = useState(false);

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Expense Form State
  const [expCategory, setExpCategory] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expVendorGstin, setExpVendorGstin] = useState('');
  const [expIsGstClaimable, setExpIsGstClaimable] = useState(false);
  const [expGstRate, setExpGstRate] = useState(18);
  const [expPaymentMode, setExpPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [expIsRecurring, setExpIsRecurring] = useState(false);
  const [expRecurrenceUnit, setExpRecurrenceUnit] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');
  const [expNotes, setExpNotes] = useState('');

  // Other Income Form State
  const [incCategory, setIncCategory] = useState('');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incAmount, setIncAmount] = useState('');
  const [incSource, setIncSource] = useState('');
  const [incPaymentMode, setIncPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [incNotes, setIncNotes] = useState('');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTaxDeductible, setNewCatTaxDeductible] = useState(true);

  // 1. Fetch Metrics Summary
  const { data: metrics } = useQuery<FinancialOverview>({
    queryKey: ['expenses-overview'],
    queryFn: async () => {
      const res: any = await apiClient.get('/expenses/overview');
      return res.data || res;
    },
  });

  // 2. Fetch Expense Categories
  const { data: categories = [] } = useQuery<ExpenseCategoryItem[]>({
    queryKey: ['expenses-categories'],
    queryFn: async () => {
      const res: any = await apiClient.get('/expenses/categories');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (data.length > 0 && !expCategory) {
        setExpCategory(data[0].id);
      }
      return data;
    },
  });

  // 3. Fetch Income Categories
  const { data: incomeCategories = [] } = useQuery<ExpenseCategoryItem[]>({
    queryKey: ['income-categories'],
    queryFn: async () => {
      const res: any = await apiClient.get('/other-income/categories');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (data.length > 0 && !incCategory) {
        setIncCategory(data[0].id);
      }
      return data;
    },
  });

  // 4. Fetch Expenses
  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery<ExpenseItem[]>({
    queryKey: ['expenses-list', selectedCategoryFilter, gstOnlyFilter],
    queryFn: async () => {
      const params: any = {};
      if (selectedCategoryFilter !== 'ALL') params.categoryId = selectedCategoryFilter;
      if (gstOnlyFilter) params.isGstClaimable = true;
      const res: any = await apiClient.get('/expenses', { params });
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // 5. Fetch Other Income
  const { data: otherIncomes = [], isLoading: isIncomeLoading } = useQuery<OtherIncomeItem[]>({
    queryKey: ['other-income-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/other-income');
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-overview'] });
      setIsExpenseModalOpen(false);
      resetExpenseForm();
    },
    onError: (err: any) => {
      setFormError(err.message || err.response?.data?.message || 'Failed to record expense.');
    },
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/other-income', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other-income-list'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-overview'] });
      setIsIncomeModalOpen(false);
      resetIncomeForm();
    },
    onError: (err: any) => {
      setFormError(err.message || err.response?.data?.message || 'Failed to record other income.');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/expenses/categories', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-categories'] });
      setIsCategoryModalOpen(false);
      setNewCatName('');
      setNewCatCode('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create category.');
    },
  });

  const resetExpenseForm = () => {
    setExpAmount('');
    setExpVendor('');
    setExpVendorGstin('');
    setExpIsGstClaimable(false);
    setExpIsRecurring(false);
    setExpNotes('');
    setFormError('');
  };

  const resetIncomeForm = () => {
    setIncAmount('');
    setIncSource('');
    setIncNotes('');
    setFormError('');
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid expense amount.');
      return;
    }
    setFormError('');
    createExpenseMutation.mutate({
      categoryId: expCategory || categories[0]?.id,
      expenseDate: expDate,
      amount: amt,
      vendorName: expVendor || undefined,
      vendorGstin: expVendorGstin || undefined,
      isGstClaimable: expIsGstClaimable,
      gstRate: expIsGstClaimable ? expGstRate : 0,
      paymentMode: expPaymentMode,
      isRecurring: expIsRecurring,
      recurrenceUnit: expIsRecurring ? expRecurrenceUnit : undefined,
      notes: expNotes || undefined,
    });
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incAmount);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid income amount.');
      return;
    }
    setFormError('');
    createIncomeMutation.mutate({
      categoryId: incCategory || incomeCategories[0]?.id,
      incomeDate: incDate,
      amount: amt,
      source: incSource || 'Other Income',
      paymentMode: incPaymentMode,
      notes: incNotes || undefined,
    });
  };

  // Filtered expense list
  const filteredExpenses = expenses.filter(
    (e) =>
      e.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-teal-600" /> Business Expenses & Other Income
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track day-to-day operating overheads, GST input tax credits (ITC), recurring bills, and non-operating income
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              resetExpenseForm();
              setIsExpenseModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Record Expense
          </button>

          <button
            onClick={() => {
              resetIncomeForm();
              setIsIncomeModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Record Other Income
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
            ₹{formatCurrency(metrics?.totalExpense || '0')}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {metrics?.expenseCount || 0} vouchers recorded
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-teal-700 text-xs font-semibold uppercase">
            <span>GST ITC Claimable</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-bold font-mono text-teal-700 mt-1.5">
            ₹{formatCurrency(metrics?.totalItcAmount || '0')}
          </div>
          <span className="text-[11px] text-teal-600/80 mt-0.5 block">
            Input Tax Credit eligibility
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase">
            <span>Other Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1.5">
            ₹{formatCurrency(metrics?.totalOtherIncome || '0')}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
            Non-operating yield / interest
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase">
            <span>Recurring Bills</span>
            <Repeat className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
            {metrics?.recurringCount || 0} Bills
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Rent, utilities & retainers
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" /> Operating Expenses ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'income'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Other Income ({otherIncomes.length})
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Categories & Classifications ({categories.length})
        </button>
      </div>

      {/* ================= TAB 1: OPERATING EXPENSES ================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voucher #, vendor or notes..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none font-semibold text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={gstOnlyFilter}
                  onChange={(e) => setGstOnlyFilter(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>GST Claimable Only</span>
              </label>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-28">Voucher #</th>
                    <th className="py-3 px-4 w-24">Date</th>
                    <th className="py-3 px-4">Expense Category</th>
                    <th className="py-3 px-4">Payee / Vendor</th>
                    <th className="py-3 px-4">GST Treatment</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Input Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isExpensesLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        Loading operating expenses...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No expenses recorded yet. Click "Record Expense" to add your first voucher.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const totalAmt = parseFloat(exp.amount.toString());
                      const itc = parseFloat(exp.cgstAmount.toString()) + parseFloat(exp.sgstAmount.toString());

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {exp.voucherNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {new Date(exp.expenseDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              {exp.category?.name}
                              {exp.isRecurring && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono text-[9px] font-bold border border-blue-200">
                                  {exp.recurrenceUnit || 'RECURRING'}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{exp.vendorName || 'Counter Cash Payee'}</div>
                            {exp.vendorGstin && (
                              <div className="font-mono text-[10px] text-teal-700">{exp.vendorGstin}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {exp.isGstClaimable ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                <ShieldCheck className="w-3 h-3 text-teal-600" /> Claimable ({exp.gstRate}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Non-GST Expense
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {exp.paymentMode}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-teal-700">
                            {itc > 0 ? `₹${formatCurrency(itc)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{formatCurrency(totalAmt)}
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
      )}

      {/* ================= TAB 2: OTHER INCOME ================= */}
      {activeTab === 'income' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-28">Voucher #</th>
                    <th className="py-3 px-4 w-24">Date</th>
                    <th className="py-3 px-4">Income Classification</th>
                    <th className="py-3 px-4">Source / Narration</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Amount Received (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isIncomeLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        Loading other income records...
                      </td>
                    </tr>
                  ) : otherIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No non-operating income recorded yet. Click "Record Other Income" to add.
                      </td>
                    </tr>
                  ) : (
                    otherIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {inc.voucherNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {new Date(inc.incomeDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {inc.category?.name}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {inc.source || 'General other income'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {inc.paymentMode}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          +₹{formatCurrency(inc.amount)}
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

      {/* ================= TAB 3: CATEGORIES ================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configured Nominal Expense Headings</h2>
              <p className="text-xs text-slate-500">Classify operational expenditures for automated Profit & Loss reporting</p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900">{c.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    {c.code || 'NOMINAL-EXP'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tax Deductible
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-600" /> Record Business Expense Voucher
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Expense Category *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Total Expense Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Mode *</label>
                  <select
                    value={expPaymentMode}
                    onChange={(e) => setExpPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / Dynamic QR</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payee / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra State Electricity Distribution"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                </div>

                {/* GST Claimable Options */}
                <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={expIsGstClaimable}
                      onChange={(e) => setExpIsGstClaimable(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Claim GST Input Tax Credit (ITC) for this expense</span>
                  </label>

                  {expIsGstClaimable && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Vendor GSTIN</label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="27AABCU9603R1ZX"
                          value={expVendorGstin}
                          onChange={(e) => setExpVendorGstin(e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Applicable GST Rate</label>
                        <select
                          value={expGstRate}
                          onChange={(e) => setExpGstRate(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                        >
                          <option value={5}>5% (Transport/Essential)</option>
                          <option value={12}>12% (Telecom/Printing)</option>
                          <option value={18}>18% (Standard Commercial/IT)</option>
                          <option value={28}>28% (Luxury/Special)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recurring Options */}
                <div className="col-span-2 p-3 bg-blue-50/40 border border-blue-200/60 rounded-lg space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-900">
                    <input
                      type="checkbox"
                      checked={expIsRecurring}
                      onChange={(e) => setExpIsRecurring(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Recurring Bill (Auto-schedule periodic voucher)</span>
                  </label>

                  {expIsRecurring && (
                    <div className="pt-1">
                      <select
                        value={expRecurrenceUnit}
                        onChange={(e) => setExpRecurrenceUnit(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white font-semibold"
                      >
                        <option value="MONTHLY">Monthly Recurring (e.g. Office Rent)</option>
                        <option value="QUARTERLY">Quarterly Recurring</option>
                        <option value="ANNUAL">Annual Renewal (e.g. Software License)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Narration</label>
                  <input
                    type="text"
                    placeholder="Brief description of the expenditure"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {createExpenseMutation.isPending ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Other Income Modal */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Record Non-Operating Other Income
              </h3>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIncomeSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Income Classification *</label>
                <select
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                >
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Income Date *</label>
                <input
                  type="date"
                  required
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Income Source / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fixed Deposit Interest Q3"
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-800 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Deposit Payment Mode *</label>
                <select
                  value={incPaymentMode}
                  onChange={(e) => setIncPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / Direct Credit</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash in Hand</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIncomeMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {createIncomeMutation.isPending ? 'Saving...' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Add Expense Category</h3>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Legal & Professional Fees"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Code (Optional)</label>
              <input
                type="text"
                placeholder="EXP-LEGAL"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catTaxDeductible"
                checked={newCatTaxDeductible}
                onChange={(e) => setNewCatTaxDeductible(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="catTaxDeductible" className="text-xs text-slate-700 font-medium">
                Tax Deductible Expense
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createCategoryMutation.mutate({
                    name: newCatName,
                    code: newCatCode || undefined,
                    isTaxDeductible: newCatTaxDeductible,
                  })
                }
                disabled={!newCatName.trim() || createCategoryMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {createCategoryMutation.isPending ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
