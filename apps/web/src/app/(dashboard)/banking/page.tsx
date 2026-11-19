'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Landmark,
  Plus,
  Search,
  CheckCircle2,
  X,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Building,
} from 'lucide-react';

interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string | null;
  accountType: string;
  upiId: string | null;
  openingBalance: string | number;
  currentBalance: string | number;
  isDefault: boolean;
  _count?: { transactions: number };
}

interface BankTransactionItem {
  id: string;
  bankAccountId: string;
  transactionDate: string;
  type: string;
  amount: string | number;
  balanceAfter: string | number;
  referenceNo: string | null;
  chequeNumber: string | null;
  isReconciled: boolean;
  reconciledAt: string | null;
  notes: string | null;
  account?: { id: string; bankName: string; accountNumber: string } | null;
}

interface LoanEmiItem {
  id: string;
  installmentNo: number;
  dueDate: string;
  principalPart: string | number;
  interestPart: string | number;
  totalEmi: string | number;
  isPaid: boolean;
  paidDate: string | null;
}

interface LoanAccountItem {
  id: string;
  lenderName: string;
  loanNumber: string;
  principalAmount: string | number;
  interestRatePct: string | number;
  tenureMonths: number;
  emiAmount: string | number;
  disbursedDate: string;
  outstandingBalance: string | number;
  status: string;
  emiSchedules: LoanEmiItem[];
}

interface BankingOverview {
  accountsCount: number;
  totalBankBalance: number;
  activeLoansCount: number;
  totalLoanOutstanding: number;
  totalMonthlyEmi: number;
}

export default function BankingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'loans'>('accounts');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  // Form State: Bank Account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState<'CURRENT' | 'SAVINGS' | 'OVERDRAFT' | 'CASH_CREDIT'>('CURRENT');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Form State: Transaction
  const [txAccountId, setTxAccountId] = useState('');
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'CONTRA_TRANSFER' | 'CHEQUE_DEPOSIT' | 'CHEQUE_ISSUE'>('DEPOSIT');
  const [txAmount, setTxAmount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txCheque, setTxCheque] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Form State: Loan
  const [lenderName, setLenderName] = useState('');
  const [loanNumber, setLoanNumber] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRatePct, setInterestRatePct] = useState('10.5');
  const [tenureMonths, setTenureMonths] = useState('24');
  const [disbursedDate, setDisbursedDate] = useState('');

  // Overview Query
  const { data: overview } = useQuery<BankingOverview>({
    queryKey: ['banking-overview'],
    queryFn: async () => {
      const res: any = await apiClient.get('/banking/overview');
      return res.data || res;
    },
  });

  // Bank Accounts Query
  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery<BankAccountItem[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res: any = await apiClient.get('/banking/accounts');
      return res.data || [];
    },
  });

  // Transactions Query
  const { data: transactions = [], isLoading: isTxLoading } = useQuery<BankTransactionItem[]>({
    queryKey: ['bank-transactions', selectedAccountId],
    enabled: activeTab === 'transactions' || activeTab === 'accounts',
    queryFn: async () => {
      const url = selectedAccountId
        ? `/banking/transactions?bankAccountId=${selectedAccountId}`
        : '/banking/transactions';
      const res: any = await apiClient.get(url);
      return res.data || [];
    },
  });

  // Loans Query
  const { data: loans = [], isLoading: isLoansLoading } = useQuery<LoanAccountItem[]>({
    queryKey: ['loan-accounts'],
    enabled: activeTab === 'loans',
    queryFn: async () => {
      const res: any = await apiClient.get('/banking/loans');
      return res.data || [];
    },
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/banking/accounts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['banking-overview'] });
      setIsAccountModalOpen(false);
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setBranchName('');
      setOpeningBalance('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create bank account.'),
  });

  const recordTxMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/banking/transactions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['banking-overview'] });
      setIsTxModalOpen(false);
      setTxAmount('');
      setTxRef('');
      setTxCheque('');
      setTxNotes('');
    },
    onError: (err: any) => alert(err.message || 'Failed to record transaction.'),
  });

  const reconcileMutation = useMutation({
    mutationFn: async (txId: string) => apiClient.patch(`/banking/transactions/${txId}/reconcile`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      alert('Transaction reconciled with bank statement successfully!');
    },
    onError: (err: any) => alert(err.message || 'Failed to reconcile transaction.'),
  });

  const createLoanMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/banking/loans', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['banking-overview'] });
      setIsLoanModalOpen(false);
      setLenderName('');
      setLoanNumber('');
      setPrincipalAmount('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create loan account.'),
  });

  const payEmiMutation = useMutation({
    mutationFn: async (emiId: string) => apiClient.post(`/banking/loans/emi/${emiId}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['banking-overview'] });
      alert('EMI installment successfully marked as paid and principal deducted!');
    },
    onError: (err: any) => alert(err.message || 'Failed to process EMI payment.'),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-teal-600" /> Cash, Bank & Loans Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Multiple bank accounts, live passbook contra records, cheque clearing & loan EMI amortization
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'accounts' && (
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Bank Account
            </button>
          )}

          {activeTab === 'transactions' && (
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Record Deposit / Contra
            </button>
          )}

          {activeTab === 'loans' && (
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Register New Loan
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Landmark className="w-4 h-4 text-teal-600" /> Total Bank Balance
          </div>
          <div className="mt-1 text-lg font-bold text-teal-700 font-mono">
            {formatCurrency(Number(overview?.totalBankBalance || 0))}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {overview?.accountsCount || 0} accounts
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <CreditCard className="w-4 h-4 text-blue-600" /> Active Accounts
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.accountsCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Current & OD accounts</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Building className="w-4 h-4 text-amber-600" /> Active Loans
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
            {overview?.activeLoansCount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Business term loans</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <CreditCard className="w-4 h-4 text-rose-600" /> Loan Outstanding
          </div>
          <div className="mt-1 text-lg font-bold text-rose-700 font-mono">
            {formatCurrency(Number(overview?.totalLoanOutstanding || 0))}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total principal payable</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-purple-600" /> Monthly EMI Commitment
          </div>
          <div className="mt-1 text-lg font-bold text-purple-700 font-mono">
            {formatCurrency(Number(overview?.totalMonthlyEmi || 0))}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Monthly installments</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" /> Bank Accounts
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Passbook & Contra Vouchers
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'loans'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" /> Loan Accounts & EMI Amortization
        </button>
      </div>

      {/* ================= TAB 1: BANK ACCOUNTS ================= */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isAccountsLoading ? (
            <div className="col-span-3 py-12 text-center text-slate-400 font-medium">
              Loading bank accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-400">
              No bank accounts configured. Click &quot;Add Bank Account&quot; to initialize banking.
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-teal-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-teal-600" /> {acc.bankName}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      A/C: {acc.accountNumber}
                    </div>
                  </div>
                  {acc.isDefault && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      PRIMARY
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] text-slate-500">Current Available Balance</div>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {formatCurrency(Number(acc.currentBalance))}
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">IFSC Code:</span>
                    <span className="font-mono font-semibold">{acc.ifscCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Type:</span>
                    <span className="font-semibold">{acc.accountType}</span>
                  </div>
                  {acc.upiId && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">UPI VPA:</span>
                      <span className="font-mono text-teal-700">{acc.upiId}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {acc._count?.transactions || 0} Transactions
                  </span>
                  <button
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setActiveTab('transactions');
                    }}
                    className="text-xs text-teal-600 font-semibold hover:underline"
                  >
                    View Passbook &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB 2: TRANSACTIONS & PASSBOOK ================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by reference, cheque # or notes..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Ref / Cheque #</th>
                  <th className="py-3 px-4 text-right">Debit (Withdrawal)</th>
                  <th className="py-3 px-4 text-right">Credit (Deposit)</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isTxLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading passbook records...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No passbook transactions recorded. Click &quot;Record Deposit / Contra&quot; to log entries.
                    </td>
                  </tr>
                ) : (
                  transactions
                    .filter(
                      (tx) =>
                        (tx.referenceNo || '').toLowerCase().includes(search.toLowerCase()) ||
                        (tx.chequeNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                        (tx.notes || '').toLowerCase().includes(search.toLowerCase())
                    )
                    .map((tx) => {
                      const isCredit = tx.type === 'DEPOSIT' || tx.type === 'CHEQUE_DEPOSIT';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {new Date(tx.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {tx.account?.bankName}
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">
                              {tx.account?.accountNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCredit
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {tx.chequeNumber ? `Chq: ${tx.chequeNumber}` : tx.referenceNo || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-rose-700">
                            {!isCredit ? (
                              <span className="flex items-center justify-end gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                {formatCurrency(Number(tx.amount))}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {isCredit ? (
                              <span className="flex items-center justify-end gap-1">
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                {formatCurrency(Number(tx.amount))}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(Number(tx.balanceAfter))}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {tx.isReconciled ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" /> Reconciled
                              </span>
                            ) : (
                              <button
                                onClick={() => reconcileMutation.mutate(tx.id)}
                                disabled={reconcileMutation.isPending}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              >
                                Match &amp; Reconcile
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: LOANS & EMIS ================= */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {isLoansLoading ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              Loading loan accounts...
            </div>
          ) : loans.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              No active loan accounts. Click &quot;Register New Loan&quot; to track business debt &amp; EMI schedules.
            </div>
          ) : (
            loans.map((loan) => (
              <div
                key={loan.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Building className="w-5 h-5 text-amber-600" /> {loan.lenderName}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Loan A/C: {loan.loanNumber} • Disbursed:{' '}
                      {new Date(loan.disbursedDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Principal</div>
                      <div className="text-sm font-bold font-mono text-slate-900">
                        {formatCurrency(Number(loan.principalAmount))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Interest Rate</div>
                      <div className="text-sm font-bold font-mono text-slate-900">
                        {Number(loan.interestRatePct)}% p.a.
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Monthly EMI</div>
                      <div className="text-sm font-bold font-mono text-purple-700">
                        {formatCurrency(Number(loan.emiAmount))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">Outstanding</div>
                      <div className="text-sm font-bold font-mono text-rose-700">
                        {formatCurrency(Number(loan.outstandingBalance))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    EMI Repayment Amortization Schedule ({loan.emiSchedules.length} Installments)
                  </h4>
                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Inst #</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3 text-right">Principal</th>
                          <th className="py-2 px-3 text-right">Interest</th>
                          <th className="py-2 px-3 text-right">Total EMI</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loan.emiSchedules.map((emi) => (
                          <tr key={emi.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">
                              #{emi.installmentNo}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {new Date(emi.dueDate).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatCurrency(Number(emi.principalPart))}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatCurrency(Number(emi.interestPart))}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(Number(emi.totalEmi))}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {emi.isPaid ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  PAID
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  DUE
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {!emi.isPaid ? (
                                <button
                                  onClick={() => payEmiMutation.mutate(emi.id)}
                                  disabled={payEmiMutation.isPending}
                                  className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-[11px] border border-teal-200 transition"
                                >
                                  Mark Paid
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Paid on{' '}
                                  {emi.paidDate ? new Date(emi.paidDate).toLocaleDateString() : ''}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= MODAL: ADD BANK ACCOUNT ================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-teal-600" /> Add Bank Account
              </h3>
              <button onClick={() => setIsAccountModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAccountMutation.mutate({
                  bankName,
                  accountNumber,
                  ifscCode,
                  branchName: branchName || undefined,
                  accountType,
                  upiId: upiId || undefined,
                  openingBalance: parseFloat(openingBalance) || 0,
                  isDefault,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="50200012345678"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="HDFC0000123"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Type *</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CURRENT">Current Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="OVERDRAFT">Overdraft (OD)</option>
                    <option value="CASH_CREDIT">Cash Credit (CC)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">UPI ID (VPA)</label>
                  <input
                    type="text"
                    placeholder="company@hdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="50000"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-teal-800 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultAcc"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="isDefaultAcc" className="text-xs text-slate-700 font-semibold">
                  Set as primary bank account for billing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createAccountMutation.isPending ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD TRANSACTION ================= */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" /> Record Passbook / Contra Transaction
              </h3>
              <button onClick={() => setIsTxModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordTxMutation.mutate({
                  bankAccountId: txAccountId,
                  type: txType,
                  amount: parseFloat(txAmount) || 0,
                  referenceNo: txRef || undefined,
                  chequeNumber: txCheque || undefined,
                  notes: txNotes || undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Bank Account *</label>
                <select
                  required
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="">-- Choose Account --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} ({acc.accountNumber}) - Bal: {formatCurrency(Number(acc.currentBalance))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Transaction Type *</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="DEPOSIT">Direct Deposit (+)</option>
                    <option value="WITHDRAWAL">Cash Withdrawal (-)</option>
                    <option value="CONTRA_TRANSFER">Contra Transfer</option>
                    <option value="CHEQUE_DEPOSIT">Cheque Deposit (+)</option>
                    <option value="CHEQUE_ISSUE">Cheque Issued (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="25000"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-teal-800 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    placeholder="UTR-98234823"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cheque # (Optional)</label>
                  <input
                    type="text"
                    placeholder="CHQ-001234"
                    value={txCheque}
                    onChange={(e) => setTxCheque(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Narration / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposited from daily counter sales"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordTxMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {recordTxMutation.isPending ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REGISTER LOAN ================= */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-600" /> Register Business Loan &amp; EMI Schedule
              </h3>
              <button onClick={() => setIsLoanModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLoanMutation.mutate({
                  lenderName,
                  loanNumber,
                  principalAmount: parseFloat(principalAmount) || 0,
                  interestRatePct: parseFloat(interestRatePct) || 0,
                  tenureMonths: parseInt(tenureMonths) || 12,
                  disbursedDate: disbursedDate || undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Lender / Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Loan Account # *</label>
                <input
                  type="text"
                  required
                  placeholder="SBI-MSME-2026-98"
                  value={loanNumber}
                  onChange={(e) => setLoanNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    placeholder="1000000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-amber-700 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Annual Interest % *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={interestRatePct}
                    onChange={(e) => setInterestRatePct(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tenure (Months) *</label>
                  <input
                    type="number"
                    required
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={disbursedDate}
                    onChange={(e) => setDisbursedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoanMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {createLoanMutation.isPending ? 'Registering...' : 'Register Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
