'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Percent,
  TrendingUp,
  Award,
  Search,
  X,
  Share2,
} from 'lucide-react';

interface SalespersonItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  commissionPct: number;
  isActive: boolean;
  createdAt: string;
  stats: {
    totalSales: number;
    commissionEarned: number;
    dealsClosed: number;
  };
}

export default function SalespersonsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPct, setCommissionPct] = useState('5.0');

  // Query salespersons
  const { data: salespersons = [], isLoading } = useQuery<SalespersonItem[]>({
    queryKey: ['salespersons-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/salespersons');
      return Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Query performance report
  const { data: report } = useQuery<any>({
    queryKey: ['salespersons-report'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/salespersons/report');
      return res.data || res;
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/sales/salespersons', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salespersons-list'] });
      queryClient.invalidateQueries({ queryKey: ['salespersons-report'] });
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setCommissionPct('5.0');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create salesperson.');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiClient.patch(`/sales/salespersons/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salespersons-list'] });
      queryClient.invalidateQueries({ queryKey: ['salespersons-report'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setFormError('Name and phone number are required.');
      return;
    }
    setFormError('');
    createMutation.mutate({
      name,
      phone,
      email: email || undefined,
      commissionPct: parseFloat(commissionPct) || 0,
    });
  };

  const filteredSalespersons = salespersons.filter(
    (sp) =>
      sp.name.toLowerCase().includes(search.toLowerCase()) ||
      sp.phone.includes(search) ||
      (sp.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" /> Salespersons & Field Staff Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track salesperson performance, deal commissions, field territory coverage, and agent payouts
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> Add Salesperson
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Users className="w-4 h-4 text-teal-600" /> Total Field Staff
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            {report?.totalSalespersons || salespersons.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {report?.activeSalespersons || salespersons.filter((s) => s.isActive).length} currently active
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Field Revenue Generated
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(Number(report?.totalFieldRevenue || 0))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all field territories</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Percent className="w-4 h-4 text-amber-600" /> Total Commissions Due
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600 font-mono">
            {formatCurrency(Number(report?.totalCommissions || 0))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Accrued agent incentive pay</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Award className="w-4 h-4 text-purple-600" /> Total Deals Closed
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            {report?.totalDeals || 0} Deals
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Attributed sales orders</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search salesperson by name, phone or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Salespersons Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Salesperson</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4 text-center">Commission Rate</th>
              <th className="py-3 px-4 text-center">Deals Closed</th>
              <th className="py-3 px-4 text-right">Attributed Sales</th>
              <th className="py-3 px-4 text-right">Commission Earned</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Connect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Loading sales staff directory...
                </td>
              </tr>
            ) : filteredSalespersons.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No salespersons found. Click &quot;Add Salesperson&quot; to register your first sales agent.
                </td>
              </tr>
            ) : (
              filteredSalespersons.map((sp) => (
                <tr key={sp.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                        {sp.name.charAt(0)}
                      </div>
                      <span>{sp.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" /> {sp.phone}
                    </div>
                    {sp.email && (
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" /> {sp.email}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-teal-700">
                    {sp.commissionPct}%
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-800">
                    {sp.stats.dealsClosed}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(sp.stats.totalSales)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                    {formatCurrency(sp.stats.commissionEarned)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        toggleStatusMutation.mutate({ id: sp.id, isActive: !sp.isActive })
                      }
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                        sp.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {sp.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const clean = sp.phone.replace(/[^0-9]/g, '');
                        const phone = clean.length === 10 ? `91${clean}` : clean;
                        const text = encodeURIComponent(
                          `Hi ${sp.name}, your total sales this period are ${formatCurrency(
                            sp.stats.totalSales
                          )} with an earned commission of ${formatCurrency(sp.stats.commissionEarned)}. Keep up the good work!`
                        );
                        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition"
                      title="Send Sales & Commission Statement via WhatsApp"
                    >
                      <Share2 className="w-3 h-3" /> WhatsApp
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Salesperson Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-600" /> Add New Salesperson
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Phone / Mobile *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9820011223"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="e.g. 5.0"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. vikram@bizflow.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Salesperson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
