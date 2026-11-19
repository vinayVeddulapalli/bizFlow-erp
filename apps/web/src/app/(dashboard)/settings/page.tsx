'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../context/auth-context';
import {
  Building,
  MapPin,
  Warehouse,
  ShieldCheck,
  Plus,
  CheckCircle2,
  ArrowRightLeft,
  X,
  BadgeCheck,
} from 'lucide-react';

interface BranchItem {
  id: string;
  name: string;
  code: string;
  gstin: string | null;
  addressLine1: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  isMainBranch: boolean;
  warehouses?: Array<{ id: string; name: string; code: string }>;
}

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  branchId?: string;
  createdAt?: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { memberships, activeOrgId, switchOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'branches' | 'warehouses' | 'companies'>('profile');

  // Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchGstin, setBranchGstin] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('Maharashtra');
  const [branchStateCode, setBranchStateCode] = useState('27');
  const [branchPostalCode, setBranchPostalCode] = useState('400001');

  // Warehouse Form
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whBranchId, setWhBranchId] = useState('');

  // Active Org Details Query
  const { data: orgData } = useQuery<any>({
    queryKey: ['active-organization', activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const res: any = await apiClient.get(`/organizations/${activeOrgId}`);
      return res.data?.organization || res.data || res;
    },
  });

  // Branches Query
  const { data: branches = [] } = useQuery<BranchItem[]>({
    queryKey: ['branches', activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // Warehouses Query
  const { data: warehouses = [] } = useQuery<WarehouseItem[]>({
    queryKey: ['warehouses', activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/warehouses');
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // Create Branch Mutation
  const createBranchMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/branches', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ['warehouses', activeOrgId] });
      setIsBranchModalOpen(false);
      resetBranchForm();
    },
    onError: (err: any) => {
      setFormError(err.message || err.response?.data?.message || 'Failed to create branch.');
    },
  });

  // Create Warehouse Mutation
  const createWhMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/inventory/warehouses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', activeOrgId] });
      setIsWarehouseModalOpen(false);
      resetWhForm();
    },
    onError: (err: any) => {
      setFormError(err.message || err.response?.data?.message || 'Failed to create warehouse.');
    },
  });

  const resetBranchForm = () => {
    setBranchName('');
    setBranchCode('');
    setBranchGstin('');
    setBranchAddress('');
    setBranchCity('');
    setBranchState('Maharashtra');
    setBranchStateCode('27');
    setBranchPostalCode('400001');
    setFormError('');
  };

  const resetWhForm = () => {
    setWhName('');
    setWhCode('');
    setWhBranchId('');
    setFormError('');
  };

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode) {
      setFormError('Please enter Branch Name and Branch Code.');
      return;
    }
    setFormError('');
    createBranchMutation.mutate({
      name: branchName,
      code: branchCode.toUpperCase(),
      gstin: branchGstin || undefined,
      addressLine1: branchAddress || `${branchCity} Address`,
      city: branchCity || 'City',
      state: branchState,
      stateCode: branchStateCode,
      postalCode: branchPostalCode || '400001',
      isMainBranch: false,
    });
  };

  const handleWhSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whCode) {
      setFormError('Please enter Warehouse Name and Warehouse Code.');
      return;
    }
    setFormError('');
    createWhMutation.mutate({
      name: whName,
      code: whCode.toUpperCase(),
      branchId: whBranchId || (branches.length > 0 ? branches[0].id : undefined),
    });
  };

  const currentOrg = orgData || memberships.find((m) => m.organizationId === activeOrgId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-teal-600" /> Settings & Branches
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise multi-location architecture, company profile, GST registration, and warehouses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <BadgeCheck className="w-4 h-4 text-teal-600" /> Active: {currentOrg?.name || currentOrg?.organizationName || 'Acme Enterprises'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" /> Company Profile
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'branches'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" /> Operating Branches ({branches.length})
        </button>

        <button
          onClick={() => setActiveTab('warehouses')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'warehouses'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse className="w-4 h-4" /> Storage Warehouses ({warehouses.length})
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'companies'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Multi-Company Switcher ({memberships.length})
        </button>
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Legal Entity Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Primary business registration details registered for GST</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  GST Verified Entity
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Company Display Name</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900">
                    {currentOrg?.name || currentOrg?.organizationName || 'Acme Enterprises'}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Legal / Registered Name</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900">
                    {currentOrg?.legalName || currentOrg?.name || 'Acme Enterprises Private Limited'}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">GSTIN (15-Digit)</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-teal-700">
                    {currentOrg?.gstin || '27AABCU9603R1ZX'}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Permanent Account Number (PAN)</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900">
                    {currentOrg?.pan || (currentOrg?.gstin ? currentOrg.gstin.substring(2, 12) : 'AABCU9603R')}
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Base Currency</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800">
                    INR (₹) - Indian Rupee
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Fiscal Year Cycle</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800">
                    April 1 to March 31 (Indian Standard)
                  </div>
                </div>
              </div>
            </div>

            {/* Statutory Compliance Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">GST & Statutory Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">E-Way Bill Integration</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enabled (NIC Portal Ready)
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">E-Invoicing Standard</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Schema 1.03 (IRP Verified)
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Input Tax Credit (ITC)</div>
                  <div className="text-xs font-bold text-teal-700 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Auto 2B Reconciled
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary Aside */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-md">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-lg mb-3">
                BF
              </div>
              <h4 className="font-bold text-base">{currentOrg?.name || 'Acme Enterprises'}</h4>
              <p className="text-xs text-slate-400 mt-1">Tenant ID: {activeOrgId}</p>

              <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Branches:</span>
                  <span className="font-bold text-teal-400">{branches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Warehouses:</span>
                  <span className="font-bold text-teal-400">{warehouses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">User Role:</span>
                  <span className="font-bold text-white">SuperAdmin</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Quick Switch</h4>
              <p className="text-xs text-slate-500">
                You have access to {memberships.length} active company profile(s).
              </p>
              <div className="space-y-1.5 pt-1">
                {memberships.map((m) => (
                  <button
                    key={m.organizationId}
                    onClick={() => switchOrganization(m.organizationId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                      m.organizationId === activeOrgId
                        ? 'bg-teal-50 border border-teal-300 text-teal-900 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{m.organizationName}</span>
                    {m.organizationId === activeOrgId && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Operating Branches */}
      {activeTab === 'branches' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Operating Branches</h2>
              <p className="text-xs text-slate-500">Each branch maintains distinct GSTIN registrations and invoice series</p>
            </div>
            <button
              onClick={() => {
                resetBranchForm();
                setIsBranchModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                {b.isMainBranch && (
                  <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg">
                    HEAD OFFICE
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-mono font-bold text-xs">
                    {b.code}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{b.name}</h3>
                    <span className="text-[11px] text-slate-500">{b.city}, {b.state} ({b.stateCode})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">GSTIN</span>
                    <span className="font-mono font-semibold text-slate-800">{b.gstin || currentOrg?.gstin || '27AABCU9603R1ZX'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">PIN Code</span>
                    <span className="font-mono font-semibold text-slate-800">{b.postalCode || '400001'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Registered Address</span>
                    <span className="text-slate-700">{b.addressLine1}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Storage Warehouses */}
      {activeTab === 'warehouses' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Inventory Storage Warehouses</h2>
              <p className="text-xs text-slate-500">Physical storage depots assigned to operating branches for stock auditing</p>
            </div>
            <button
              onClick={() => {
                resetWhForm();
                setIsWarehouseModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Warehouse
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh) => {
              const linkedBranch = branches.find((b) => b.id === wh.branchId);
              return (
                <div key={wh.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-xs">
                        {wh.code}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{wh.name}</h3>
                        <span className="text-[11px] text-slate-500">Depot Code: {wh.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 block text-[11px]">Linked Operating Branch</span>
                    <span className="font-semibold text-slate-800">
                      {linkedBranch ? linkedBranch.name : 'Head Office (Mumbai)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Multi-Company Switcher */}
      {activeTab === 'companies' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Associated Business Organizations</h2>
            <p className="text-xs text-slate-500">Switch active tenant context to manage multi-entity accounting ledgers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberships.map((m) => {
              const isCurrent = m.organizationId === activeOrgId;
              return (
                <div
                  key={m.organizationId}
                  className={`bg-white border rounded-xl p-5 shadow-sm transition ${
                    isCurrent ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center font-bold text-sm">
                        {m.organizationName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{m.organizationName}</h3>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Role: <strong className="text-slate-700">{m.roleName}</strong></span>
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-teal-600" /> ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={() => switchOrganization(m.organizationId)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                      >
                        Switch
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                    <span>Tenant ID: <span className="font-mono">{m.organizationId.substring(0, 8)}...</span></span>
                    {isCurrent && <span className="text-teal-600 font-semibold">Active Session</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" /> Add New Operating Branch
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Regional Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-PUN"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AABCU9603R1ZX"
                    value={branchGstin}
                    onChange={(e) => setBranchGstin(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 45, Hinjewadi Phase 1"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Pune"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">State & Code</label>
                  <input
                    type="text"
                    placeholder="Maharashtra (27)"
                    value={branchState}
                    onChange={(e) => setBranchState(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBranchMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {createBranchMutation.isPending ? 'Saving...' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-teal-600" /> Add Inventory Warehouse
              </h3>
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWhSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Western Regional Logistics Depot"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Warehouse Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-03"
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Operating Branch</label>
                <select
                  value={whBranchId}
                  onChange={(e) => setWhBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWhMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {createWhMutation.isPending ? 'Saving...' : 'Save Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
