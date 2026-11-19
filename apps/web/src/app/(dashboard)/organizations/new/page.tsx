'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { useAuth } from '../../../../context/auth-context';
import { INDIAN_STATES } from '@bizflow/shared-utils';
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Warehouse,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
} from 'lucide-react';
import Link from 'next/link';

export default function NewOrganizationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshProfile, switchOrganization } = useAuth();

  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [currencyCode] = useState('INR');
  const [fiscalYearStartMonth] = useState(4); // April
  const [branchName, setBranchName] = useState('Head Office');
  const [city, setCity] = useState('Mumbai');
  const [stateCode, setStateCode] = useState('27');
  const [postalCode, setPostalCode] = useState('400001');

  // Handle GSTIN change with auto PAN and State extraction
  const handleGstinChange = (value: string) => {
    const val = value.toUpperCase().trim();
    setGstin(val);

    // Auto extract PAN (chars 3 to 12) if 10+ chars entered
    if (val.length >= 12) {
      const extractedPan = val.substring(2, 12);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan)) {
        setPan(extractedPan);
      }
    }

    // Auto extract State Code (first 2 digits)
    if (val.length >= 2) {
      const prefix = val.substring(0, 2);
      if (INDIAN_STATES[prefix]) {
        setStateCode(prefix);
      }
    }
  };

  const handleStateChange = (code: string) => {
    setStateCode(code);
  };

  const createOrgMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/organizations', payload);
      return res.data || res;
    },
    onSuccess: async (data: any) => {
      const newOrgId = data.organization?.id || data.id;
      setSuccessMessage('Organization registered successfully! Switching context...');

      queryClient.invalidateQueries();
      await refreshProfile();

      if (newOrgId) {
        await switchOrganization(newOrgId);
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    },
    onError: (err: any) => {
      setFormError(err.message || err.response?.data?.message || 'Failed to create organization.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Organization name is required.');
      return;
    }

    const stateObj = INDIAN_STATES[stateCode];
    const stateName = stateObj ? stateObj.name : 'Maharashtra';

    createOrgMutation.mutate({
      name: name.trim(),
      legalName: legalName.trim() || undefined,
      gstin: gstin.trim() || undefined,
      pan: pan.trim() || undefined,
      currencyCode,
      fiscalYearStartMonth,
      branchName: branchName.trim() || 'Head Office',
      city: city.trim() || 'Mumbai',
      state: stateName,
      stateCode,
      postalCode: postalCode.trim() || '400001',
    });
  };

  const selectedState = INDIAN_STATES[stateCode] || { name: 'Maharashtra', code: '27' };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings & Branches
        </Link>
      </div>

      {/* Main Title Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold text-xl shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Register New Business Organization
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Create a distinct company entity with dedicated GST registration, chart of accounts, and warehouse depots
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold self-start sm:self-auto">
            <Building className="w-3.5 h-3.5 text-teal-600" /> Multi-Tenant Entity
          </span>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Legal Entity Master */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Legal Business Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Organization Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Brand or trading title visible throughout invoices and portal
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Legal Registered Entity Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions Private Limited"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Official name as registered under ROC / MCA / GST
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="e.g. 27AABCU9603R1ZX"
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Auto-populates PAN and state jurisdiction
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="e.g. AABCU9603R"
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                10-digit Income Tax PAN
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Primary Branch & Warehouse */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Primary Operating Branch & Depot
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Branch Name *
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Head Office"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Branch code <code className="text-teal-700 font-bold">BR-01</code> will be assigned automatically
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State (Place of Supply / Tax Jurisdiction) *
              </label>
              <select
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold text-slate-800"
              >
                {Object.values(INDIAN_STATES).map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Selected: {selectedState.name} (GST Code: {selectedState.code})
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Operating City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Postal PIN Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="400001"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3 text-xs text-slate-600">
            <Warehouse className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              An initial inventory depot <span className="font-bold text-slate-800 font-mono">WH-01 ({branchName} Warehouse)</span> will be automatically configured for stock receipts.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/settings"
            className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createOrgMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {createOrgMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering Company...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Create Company & Switch
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
