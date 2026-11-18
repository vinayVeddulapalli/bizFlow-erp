'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Building,
  Warehouse,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  kpis: {
    totalSales: string;
    totalPurchases: string;
    outstandingReceivables: string;
    outstandingPayables: string;
    netCashFlow: string;
    totalProducts?: number;
    lowStockItems?: number;
  };
  counts: {
    branches: number;
    warehouses: number;
    teamMembers: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    user: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res: any = await apiClient.get('/dashboard/summary');
      return res.data;
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Business Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial positions, ledger metrics, and organizational status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> New Sales Invoice
          </Link>
          <Link
            href="/purchases/bills/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
          >
            <Receipt className="w-4 h-4" /> Record Bill
          </Link>
        </div>
      </div>

      {/* 4 Core Financial KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue (Sales)
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 financial-figure text-left">
              {isLoading ? '...' : formatCurrency(data?.kpis.totalSales || '0')}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center">
                <ArrowUpRight className="w-3 h-3" /> Live
              </span>
              Calculated from posted invoices
            </p>
          </div>
        </div>

        {/* Card 2: Total Purchases */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Purchases
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 financial-figure text-left">
              {isLoading ? '...' : formatCurrency(data?.kpis.totalPurchases || '0')}
            </div>
            <p className="text-xs text-slate-400 mt-1">Vendor purchase invoices (bills)</p>
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Outstanding Receivables
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 financial-figure text-left">
              {isLoading ? '...' : formatCurrency(data?.kpis.outstandingReceivables || '0')}
            </div>
            <p className="text-xs text-slate-400 mt-1">Pending payments from customers</p>
          </div>
        </div>

        {/* Card 4: Outstanding Payables */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Outstanding Payables
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-red-600 financial-figure text-left">
              {isLoading ? '...' : formatCurrency(data?.kpis.outstandingPayables || '0')}
            </div>
            <p className="text-xs text-slate-400 mt-1">Pending obligations to suppliers</p>
          </div>
        </div>
      </div>

      {/* Organization Operating Footprint */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">
          Company Infrastructure Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{data?.counts.branches ?? 1}</div>
              <div className="text-xs text-slate-500">Active Operating Branches</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{data?.counts.warehouses ?? 1}</div>
              <div className="text-xs text-slate-500">Configured Warehouses</div>
            </div>
          </div>

          <Link
            href="/inventory/products"
            className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{data?.kpis.totalProducts ?? 0}</div>
              <div className="text-xs text-slate-500">Active Catalog Items</div>
            </div>
          </Link>

          <Link
            href="/inventory/products"
            className={`flex items-center gap-4 p-4 rounded-lg border transition ${
              (data?.kpis.lowStockItems ?? 0) > 0
                ? 'bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-slate-50 border-slate-100 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                (data?.kpis.lowStockItems ?? 0) > 0
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold">
                {data?.kpis.lowStockItems ?? 0}
              </div>
              <div className="text-xs text-slate-500">Low Stock Reorders</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Ledger Audit */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Enterprise Audit Activity</h3>
          <span className="text-xs text-slate-400">Append-only security log</span>
        </div>

        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{activity.action}</span>
                  <span className="text-slate-400 ml-2">({activity.entityType})</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                  <span>{activity.user}</span>
                  <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No recent audit entries recorded for this organization yet.
          </div>
        )}
      </div>
    </div>
  );
}
