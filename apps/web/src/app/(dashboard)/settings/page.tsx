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
  Printer,
  FileText,
  QrCode,
  Share2,
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
  const [activeTab, setActiveTab] = useState<'profile' | 'branches' | 'warehouses' | 'companies' | 'templates'>('profile');

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

  // Invoice Template Query
  const { data: templateConfig, refetch: refetchTemplate } = useQuery<any>({
    queryKey: ['invoice-template', activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const res: any = await apiClient.get('/organizations/invoice-template');
      return res.data || res;
    },
  });

  const [tplTheme, setTplTheme] = useState('MODERN_TEAL');
  const [tplPaperSize, setTplPaperSize] = useState('A4');
  const [tplHeaderColor, setTplHeaderColor] = useState('#0d9488');
  const [tplInvoicePrefix, setTplInvoicePrefix] = useState('INV');
  const [tplShowLogo, setTplShowLogo] = useState(true);
  const [tplShowSignature, setTplShowSignature] = useState(true);
  const [tplShowQrCode, setTplShowQrCode] = useState(true);
  const [tplField1, setTplField1] = useState('PO Reference #');
  const [tplField2, setTplField2] = useState('Vehicle / Transporter ID');
  const [tplTerms, setTplTerms] = useState(
    '1. Goods once sold will not be taken back without original invoice.\n2. Interest @ 18% p.a. will be charged on overdue payments beyond credit period.'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (templateConfig) {
      if (templateConfig.templateTheme) setTplTheme(templateConfig.templateTheme);
      if (templateConfig.paperSize) setTplPaperSize(templateConfig.paperSize);
      if (templateConfig.headerColor) setTplHeaderColor(templateConfig.headerColor);
      if (templateConfig.invoicePrefix) setTplInvoicePrefix(templateConfig.invoicePrefix);
      if (templateConfig.showLogo !== undefined) setTplShowLogo(templateConfig.showLogo);
      if (templateConfig.showSignature !== undefined) setTplShowSignature(templateConfig.showSignature);
      if (templateConfig.showQrCode !== undefined) setTplShowQrCode(templateConfig.showQrCode);
      if (templateConfig.customField1Title !== undefined) setTplField1(templateConfig.customField1Title || '');
      if (templateConfig.customField2Title !== undefined) setTplField2(templateConfig.customField2Title || '');
      if (templateConfig.customTerms !== undefined) setTplTerms(templateConfig.customTerms || '');
    }
  }, [templateConfig]);

  const updateTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.put('/organizations/invoice-template', payload);
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetchTemplate();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update invoice template settings');
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

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Invoice Templates & Print Styling
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

      {/* Tab 5: Invoice Templates & Print Styling */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" /> Invoice Branding & Template
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize your tax invoice layout, colors, paper size, and payment QR code
                  </p>
                </div>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved!
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Theme Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">Invoice Design Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'MODERN_TEAL', name: 'Modern Teal', color: '#0d9488' },
                      { id: 'CLASSIC_NAVY', name: 'Classic Navy', color: '#1e40af' },
                      { id: 'MINIMAL_SLATE', name: 'Minimal Slate', color: '#334155' },
                      { id: 'ELEGANT_EMERALD', name: 'Elegant Emerald', color: '#059669' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setTplTheme(theme.id);
                          setTplHeaderColor(theme.color);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition text-left ${
                          tplTheme === theme.id
                            ? 'border-teal-600 bg-teal-50/50 text-teal-900 ring-1 ring-teal-500'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.color }} />
                        <span className="truncate">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paper Size */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">Paper / Output Format</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'A4', label: 'A4 Standard' },
                      { id: 'A5', label: 'A5 Compact' },
                      { id: 'THERMAL_80MM', label: '80mm Thermal' },
                      { id: 'THERMAL_58MM', label: '58mm POS' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setTplPaperSize(fmt.id)}
                        className={`p-2 rounded-lg border text-center text-xs font-bold transition ${
                          tplPaperSize === fmt.id
                            ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Color & Prefix */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tplHeaderColor}
                        onChange={(e) => setTplHeaderColor(e.target.value)}
                        className="w-9 h-9 p-0.5 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={tplHeaderColor}
                        onChange={(e) => setTplHeaderColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Invoice Number Prefix</label>
                    <input
                      type="text"
                      placeholder="e.g. INV or BF"
                      value={tplInvoicePrefix}
                      onChange={(e) => setTplInvoicePrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Custom Bill Fields (Vyapar Requirement) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Custom Header Field 1</label>
                    <input
                      type="text"
                      placeholder="e.g. PO Reference #"
                      value={tplField1}
                      onChange={(e) => setTplField1(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Custom Header Field 2</label>
                    <input
                      type="text"
                      placeholder="e.g. Vehicle / Transporter ID"
                      value={tplField2}
                      onChange={(e) => setTplField2(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Document Elements</label>
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tplShowLogo}
                      onChange={(e) => setTplShowLogo(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    Display Organization Brand Logo
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tplShowQrCode}
                      onChange={(e) => setTplShowQrCode(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    Display Dynamic UPI / BharatQR Code for Instant Payment
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tplShowSignature}
                      onChange={(e) => setTplShowSignature(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    Display Authorized Signatory & Official Stamp Box
                  </label>
                </div>

                {/* Terms and Conditions */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Standard Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={tplTerms}
                    onChange={(e) => setTplTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Enter return policies, interest on overdue payments, jurisdiction..."
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={updateTemplateMutation.isPending}
                    onClick={() => {
                      updateTemplateMutation.mutate({
                        templateTheme: tplTheme,
                        paperSize: tplPaperSize,
                        headerColor: tplHeaderColor,
                        invoicePrefix: tplInvoicePrefix,
                        showLogo: tplShowLogo,
                        showSignature: tplShowSignature,
                        showQrCode: tplShowQrCode,
                        customField1Title: tplField1,
                        customField2Title: tplField2,
                        customTerms: tplTerms,
                      });
                    }}
                    className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updateTemplateMutation.isPending ? 'Saving...' : 'Save Template Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">Live Invoice Preview ({tplPaperSize})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Hello, here is your invoice #${tplInvoicePrefix}-2026-0042 from ${
                        orgData?.name || 'BizFlow'
                      }. Total Payable: Rs. 14,160. Thank you for your business!`
                    );
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            </div>

            {/* Simulated Invoice Document Paper */}
            {tplPaperSize.startsWith('THERMAL') ? (
              /* Thermal Paper View */
              <div className="max-w-xs mx-auto bg-white border border-slate-300 rounded-lg p-5 shadow-md font-mono text-[11px] text-slate-800 space-y-3">
                <div className="text-center border-b border-dashed border-slate-300 pb-3">
                  <div className="font-bold text-sm tracking-wide uppercase">{orgData?.name || 'Acme Enterprises'}</div>
                  <div className="text-[10px] text-slate-600">{orgData?.gstin ? `GSTIN: ${orgData.gstin}` : 'GSTIN: 27AABCU9603R1ZX'}</div>
                  <div className="text-[10px] text-slate-500">TAX INVOICE / RETAIL RECEIPT</div>
                </div>

                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-bold">{tplInvoicePrefix}-2026-0089</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>19-Nov-2026 13:45</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-semibold">Cash Counter Sale</span>
                  </div>
                  {tplField1 && (
                    <div className="flex justify-between">
                      <span>{tplField1}:</span>
                      <span>POS-REG-01</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span>ITEM</span>
                    <span>QTY x RATE</span>
                    <span>AMT</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div>Wireless Mouse Pro</div>
                      <div className="text-[9px] text-slate-500">HSN: 847130 (18%)</div>
                    </div>
                    <span>1 x 1,200</span>
                    <span>1,416.00</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div>Mechanical Keyboard</div>
                      <div className="text-[9px] text-slate-500">HSN: 847160 (18%)</div>
                    </div>
                    <span>1 x 3,500</span>
                    <span>4,130.00</span>
                  </div>
                </div>

                <div className="space-y-1 text-right text-[10px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹4,700.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST (9%):</span>
                    <span>₹423.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (9%):</span>
                    <span>₹423.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                    <span>GRAND TOTAL:</span>
                    <span>₹5,546.00</span>
                  </div>
                </div>

                {tplShowQrCode && (
                  <div className="text-center pt-2 border-t border-dashed border-slate-300">
                    <div className="inline-block p-1 border border-slate-200 rounded bg-slate-50">
                      <QrCode className="w-16 h-16 text-slate-800 mx-auto" />
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">Scan via UPI to Pay ₹5,546</div>
                  </div>
                )}

                <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
                  {tplTerms || 'Thank you for shopping with us!'}
                </div>
              </div>
            ) : (
              /* A4 / A5 Formal Document View */
              <div
                className="bg-white border border-slate-300 rounded-xl p-8 shadow-lg space-y-6 text-xs text-slate-800 relative overflow-hidden"
                style={{ borderTop: `6px solid ${tplHeaderColor}` }}
              >
                {/* Header Section */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                  <div className="space-y-1">
                    {tplShowLogo && (
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
                          style={{ backgroundColor: tplHeaderColor }}
                        >
                          {(orgData?.name || 'BF').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-base tracking-tight text-slate-900">
                          {orgData?.name || 'Acme Enterprises'}
                        </span>
                      </div>
                    )}
                    <div className="text-xs font-semibold text-slate-700">
                      {orgData?.legalName || 'Acme Enterprises Private Limited'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      GSTIN: <span className="font-mono font-semibold text-slate-800">{orgData?.gstin || '27AABCU9603R1ZX'}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">State: Maharashtra (State Code: 27)</div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-base font-black uppercase tracking-wider" style={{ color: tplHeaderColor }}>
                      TAX INVOICE
                    </div>
                    <div className="font-mono font-bold text-sm text-slate-900">
                      #{tplInvoicePrefix}-2026-0042
                    </div>
                    <div className="text-slate-500 text-[11px]">Date: 19 Nov 2026</div>
                    <div className="text-slate-500 text-[11px]">Due Date: 04 Dec 2026</div>
                    <div className="text-slate-500 text-[11px]">Place of Supply: 27-Maharashtra</div>
                  </div>
                </div>

                {/* Bill To & Custom Fields */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Billed To (Customer)</div>
                    <div className="font-bold text-slate-900">TechNova Solutions Pvt Ltd</div>
                    <div className="text-slate-600 text-[11px]">GSTIN: 27AADCT4589K1Z8</div>
                    <div className="text-slate-500 text-[11px]">Andheri East, Mumbai, Maharashtra - 400069</div>
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Order References</div>
                    {tplField1 && (
                      <div className="text-[11px]">
                        <span className="text-slate-500">{tplField1}: </span>
                        <span className="font-semibold text-slate-800">PO-2026-8819</span>
                      </div>
                    )}
                    {tplField2 && (
                      <div className="text-[11px]">
                        <span className="text-slate-500">{tplField2}: </span>
                        <span className="font-semibold text-slate-800">MH-04-AB-1234</span>
                      </div>
                    )}
                    <div className="text-[11px]">
                      <span className="text-slate-500">Payment Terms: </span>
                      <span className="font-semibold text-slate-800">Net 15 Days</span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead style={{ backgroundColor: `${tplHeaderColor}15`, color: tplHeaderColor }}>
                      <tr className="border-b border-slate-200 font-bold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3">HSN</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500">1</td>
                        <td className="py-2 px-3 font-medium text-slate-900">ERP Software Implementation Services</td>
                        <td className="py-2 px-3 font-mono text-slate-500">998311</td>
                        <td className="py-2 px-3 text-right font-semibold">1 Lot</td>
                        <td className="py-2 px-3 text-right">10,000.00</td>
                        <td className="py-2 px-3 text-right">18%</td>
                        <td className="py-2 px-3 text-right font-bold">11,800.00</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500">2</td>
                        <td className="py-2 px-3 font-medium text-slate-900">Cloud Backup Storage Module</td>
                        <td className="py-2 px-3 font-mono text-slate-500">998314</td>
                        <td className="py-2 px-3 text-right font-semibold">2 Units</td>
                        <td className="py-2 px-3 text-right">1,000.00</td>
                        <td className="py-2 px-3 text-right">18%</td>
                        <td className="py-2 px-3 text-right font-bold">2,360.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & QR Code */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    {tplShowQrCode && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                        <div className="p-1 bg-white border border-slate-200 rounded">
                          <QrCode className="w-12 h-12 text-slate-800" />
                        </div>
                        <div className="text-[10px]">
                          <div className="font-bold text-slate-800">Scan to Pay via UPI</div>
                          <div className="text-slate-500">VPA: acme@hdfcbank</div>
                          <div className="font-bold text-teal-700 mt-0.5">₹14,160.00</div>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-600">
                      <div className="font-bold uppercase tracking-wider text-slate-500 mb-0.5">Amount in Words:</div>
                      <div className="italic font-medium">Fourteen Thousand One Hundred Sixty Rupees Only</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-right text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Value:</span>
                      <span className="font-medium">₹12,000.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span className="font-medium">₹1,080.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span className="font-medium">₹1,080.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Tax Amount:</span>
                      <span className="font-medium">₹2,160.00</span>
                    </div>
                    <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200" style={{ color: tplHeaderColor }}>
                      <span>Invoice Total:</span>
                      <span>₹14,160.00</span>
                    </div>
                  </div>
                </div>

                {/* Terms and Signatory */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 items-end">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Terms & Conditions:</div>
                    <div className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
                      {tplTerms}
                    </div>
                  </div>

                  {tplShowSignature && (
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-slate-800 mb-8">
                        For {orgData?.name || 'Acme Enterprises'}
                      </div>
                      <div className="inline-block border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                        Authorized Signatory & Seal
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
