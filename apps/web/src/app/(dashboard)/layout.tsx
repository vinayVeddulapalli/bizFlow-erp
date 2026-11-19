'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  BookOpen,
  Receipt,
  Settings,
  ChevronDown,
  Building,
  PlusCircle,
  LogOut,
  MapPin,
  Menu,
  X,
  History,
  Scale,
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  BarChart3,
  Store,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, activeOrgId, switchOrganization, logout } = useAuth();
  const pathname = usePathname();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeMembership = memberships.find((m) => m.organizationId === activeOrgId) || memberships[0];
  const activeOrgName = activeMembership?.organizationName || (user as any)?.businessName || 'Acme Enterprises';

  React.useEffect(() => {
    if (activeMembership && (!activeOrgId || activeOrgId !== activeMembership.organizationId)) {
      switchOrganization(activeMembership.organizationId);
    }
  }, [activeMembership, activeOrgId]);

  interface NavItem {
    name: string;
    href: string;
    icon: any;
    badge?: string;
  }

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'POS Counter Billing', href: '/pos', icon: Store },
    { name: 'Sales Invoices', href: '/sales/invoices', icon: ShoppingCart },
    { name: 'Customers', href: '/sales/customers', icon: Users },
    { name: 'CRM & Leads', href: '/crm/leads', icon: UserCheck },
    { name: 'Purchase Bills', href: '/purchases/bills', icon: ShoppingBag },
    { name: 'Suppliers', href: '/purchases/suppliers', icon: Building },
    { name: 'Products & Stock', href: '/inventory/products', icon: Package },
    { name: 'Stock Ledger', href: '/inventory/movements', icon: History },
    { name: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: BookOpen },
    { name: 'Journal Vouchers', href: '/accounting/journals', icon: Receipt },
    { name: 'Financial Statements', href: '/accounting/reports', icon: Scale },
    { name: 'GST & Taxation', href: '/gst/reports', icon: Receipt },
    { name: 'Staff & HR', href: '/hr/employees', icon: Users },
    { name: 'Attendance Roster', href: '/hr/attendance', icon: Calendar },
    { name: 'Payroll Processing', href: '/hr/payroll', icon: DollarSign },
    { name: 'Enterprise Analytics', href: '/reports/analytics', icon: BarChart3 },
    { name: 'Settings & Branches', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Global Navigation Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-sm tracking-wider">
              BF
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">BizFlow ERP</span>
          </Link>

          {/* Organization Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Building className="w-3.5 h-3.5 text-teal-400" />
              <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeOrgName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/50">
                  Switch Company
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {memberships.map((m) => (
                    <button
                      key={m.organizationId}
                      onClick={() => {
                        switchOrganization(m.organizationId);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/50 transition ${m.organizationId === activeOrgId
                        ? 'text-teal-400 font-bold bg-slate-700/30'
                        : 'text-slate-300'
                        }`}
                    >
                      <span className="truncate">{m.organizationName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        {m.roleName}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-700/50 pt-1 mt-1 px-2">
                  <Link
                    href="/organizations/new"
                    onClick={() => setIsOrgDropdownOpen(false)}
                    className="w-full text-left px-2 py-1.5 text-xs text-teal-400 hover:bg-slate-700/50 rounded flex items-center gap-2 font-medium"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add New Company
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Active Branch Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] font-medium text-slate-300">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>Head Office (Mumbai)</span>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{user?.fullName || 'Administrator'}</div>
            <div className="text-[11px] text-slate-400">{user?.email || 'admin@bizflow.local'}</div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-16 z-20 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="py-4 px-3 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operations
            </div>

            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.badge ? '#' : item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${isActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom Sidebar Status */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500">
            <div className="flex items-center justify-between">
              <span>BizFlow v1.0.0</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live API
              </span>
            </div>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
