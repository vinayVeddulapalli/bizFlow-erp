'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  X,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

interface LeadItem {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  estimatedValue: string | number;
  notes: string | null;
  convertedToCustomerId: string | null;
  createdAt: string;
}

export default function CrmLeadsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Website');
  const [estimatedValue, setEstimatedValue] = useState('0');
  const [notes, setNotes] = useState('');

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery<LeadItem[]>({
    queryKey: ['crm-leads'],
    queryFn: async () => {
      const res: any = await apiClient.get('/crm/leads');
      return res.data;
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/crm/leads', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || 'Failed to create lead.');
    },
  });

  // Convert to customer mutation
  const convertMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return apiClient.post(`/crm/leads/${leadId}/convert`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      alert('Lead successfully converted to registered Customer!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to convert lead.');
    },
  });

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setSource('Website');
    setEstimatedValue('0');
    setNotes('');
    setModalError('');
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('Contact name is required.');
      return;
    }

    createLeadMutation.mutate({
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      source: source || undefined,
      estimatedValue: parseFloat(estimatedValue) || 0,
      notes: notes.trim() || undefined,
    });
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.companyName && l.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = selectedStatus === 'ALL' || l.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">NEW LEAD</span>;
      case 'CONTACTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">CONTACTED</span>;
      case 'QUALIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">QUALIFIED</span>;
      case 'PROPOSAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">PROPOSAL</span>;
      case 'WON':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">WON (CONVERTED)</span>;
      case 'LOST':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">LOST</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM & Lead Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Capture prospective sales leads, track opportunity pipelines, and convert qualified prospects to customers
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Sales Lead
        </button>
      </div>

      {/* Pipeline Status Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { key: 'ALL', label: 'All Leads', count: leads.length },
          { key: 'NEW', label: 'New', count: leads.filter((l) => l.status === 'NEW').length },
          { key: 'CONTACTED', label: 'Contacted', count: leads.filter((l) => l.status === 'CONTACTED').length },
          { key: 'QUALIFIED', label: 'Qualified', count: leads.filter((l) => l.status === 'QUALIFIED').length },
          { key: 'PROPOSAL', label: 'Proposal', count: leads.filter((l) => l.status === 'PROPOSAL').length },
          { key: 'WON', label: 'Won Deals', count: leads.filter((l) => l.status === 'WON').length },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedStatus(item.key)}
            className={`p-3 rounded-xl border text-left transition ${
              selectedStatus === item.key
                ? 'bg-white border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="text-[10px] font-semibold text-slate-500 uppercase">{item.label}</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{item.count}</div>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search leads by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
          Showing {filteredLeads.length} leads
        </span>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Contact & Company</th>
                <th className="py-3 px-4">Phone / Email</th>
                <th className="py-3 px-4">Lead Source</th>
                <th className="py-3 px-4 text-right">Estimated Deal Value</th>
                <th className="py-3 px-4 text-center">Stage</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading CRM leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No leads found matching your search.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{lead.name}</div>
                      {lead.companyName && (
                        <div className="text-[11px] text-slate-400 font-normal">
                          {lead.companyName}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div>{lead.phone || '-'}</div>
                      <div className="text-slate-400">{lead.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {lead.source || 'Direct'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 financial-figure">
                      {formatCurrency(lead.estimatedValue.toString())}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {lead.convertedToCustomerId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Customer
                        </span>
                      ) : (
                        <button
                          onClick={() => convertMutation.mutate(lead.id)}
                          disabled={convertMutation.isPending}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition"
                        >
                          <UserCheck className="w-3 h-3" /> Convert to Customer
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

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add New Sales Prospect / Lead</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Tech Solutions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lead Acquisition Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Website">Company Website / Inbound</option>
                    <option value="Referral">Client Referral</option>
                    <option value="Cold Call">Outbound Sales Call</option>
                    <option value="Trade Fair">Trade Fair / Expo</option>
                    <option value="Social Media">LinkedIn / Social Media</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Notes / Requirements
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Interested in annual enterprise ERP license for 5 branches"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
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
                  disabled={createLeadMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {createLeadMutation.isPending ? 'Saving Lead...' : 'Save Sales Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
