'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, FileSpreadsheet, Building2, Layers } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-xl tracking-wider">
            BF
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">BizFlow ERP</h1>
            <p className="text-xs text-slate-400">Enterprise Edition</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg shadow-sm font-semibold transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 text-center flex-1 flex flex-col justify-center items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800/50 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4" /> Multi-Tenant • Double-Entry • Indian GST Native
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Engineered for Clarity, Speed, and <span className="text-teal-400">Financial Truth</span>.
        </h2>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          BizFlow ERP unifies multi-company invoicing, warehouse stock management, GST compliance,
          and automated double-entry general ledger in a modern, keyboard-accelerated SaaS platform.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-base shadow-lg shadow-teal-500/20 transition"
          >
            Create Business Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-base border border-slate-700 transition"
          >
            Sign In to Existing Company
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-800">
            <Building2 className="w-8 h-8 text-teal-400 mb-3" />
            <h3 className="text-lg font-bold text-white">Multi-Company & Branches</h3>
            <p className="mt-2 text-sm text-slate-400">
              Manage multiple independent businesses, branches, and warehouses with zero data leakage.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-800">
            <FileSpreadsheet className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-white">Indian GST & Invoicing</h3>
            <p className="mt-2 text-sm text-slate-400">
              Automated intra-state (CGST+SGST) vs inter-state (IGST) tax calculation with HSN/SAC codes.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-800">
            <Layers className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="text-lg font-bold text-white">Double-Entry Accounting</h3>
            <p className="mt-2 text-sm text-slate-400">
              Posting invoices updates general ledger vouchers and inventory movements atomically.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} BizFlow ERP. All rights reserved. Enterprise Resource Planning.
      </footer>
    </div>
  );
}
