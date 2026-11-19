'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { formatCurrency } from '@bizflow/shared-utils';
import {
  DollarSign,
  Plus,
  Calendar,
  CheckCircle2,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface PayrollPeriodItem {
  id: string;
  month: number;
  year: number;
  status: string;
  processedAt: string;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  payslipCount: number;
}

interface PayslipItem {
  id: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  workingDays: number;
  presentDays: number;
  basicSalary: string;
  hra: string;
  allowances: string;
  grossSalary: string;
  deductions: string;
  netSalary: string;
}

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);

  // Fetch periods
  const { data: periods = [], isLoading } = useQuery<PayrollPeriodItem[]>({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/payroll/periods');
      const data: PayrollPeriodItem[] = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      return data;
    },
  });

  // Effective active period ID
  const effectivePeriodId = activePeriodId || (periods.length > 0 ? periods[0].id : null);
  const activePeriod = periods.find((p) => p.id === effectivePeriodId) || periods[0];

  // Fetch payslips for active period
  const { data: payslips = [], isLoading: isPayslipsLoading } = useQuery<PayslipItem[]>({
    queryKey: ['payslips', effectivePeriodId],
    enabled: !!effectivePeriodId,
    queryFn: async () => {
      if (!effectivePeriodId) return [];
      const res: any = await apiClient.get(`/hr/payroll/periods/${effectivePeriodId}/payslips`);
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // Run payroll mutation
  const runPayrollMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/hr/payroll/run', {
        month: selectedMonth,
        year: selectedYear,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      const newPeriodId = res.data?.id || res.id;
      if (newPeriodId) {
        setActivePeriodId(newPeriodId);
        queryClient.invalidateQueries({ queryKey: ['payslips', newPeriodId] });
      }
      alert('Monthly payroll processed successfully.');
    },
    onError: (err: any) => {
      alert(err.message || err.response?.data?.message || 'Failed to process payroll.');
    },
  });

  const getMonthName = (m: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || `Month ${m}`;
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    const match = periods.find((p) => p.month === month && p.year === selectedYear);
    if (match) {
      setActivePeriodId(match.id);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const match = periods.find((p) => p.month === selectedMonth && p.year === year);
    if (match) {
      setActivePeriodId(match.id);
    }
  };

  const handlePeriodSelect = (periodId: string) => {
    setActivePeriodId(periodId);
    const match = periods.find((p) => p.id === periodId);
    if (match) {
      setSelectedMonth(match.month);
      setSelectedYear(match.year);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payroll Processing & Payslips</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated monthly salary computations, statutory deductions, net payouts, and employee payslips
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" /> Employee Directory
          </Link>
        </div>
      </div>

      {/* Generator & Period Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-700">Payroll Cycle:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          <button
            onClick={() => runPayrollMutation.mutate()}
            disabled={runPayrollMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {runPayrollMutation.isPending ? 'Calculating...' : 'Run Payroll'}
          </button>
        </div>

        {/* Existing Periods Selector */}
        {periods.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">View Processed Cycle:</span>
            <select
              value={effectivePeriodId || ''}
              onChange={(e) => handlePeriodSelect(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 outline-none"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {getMonthName(p.month)} {p.year} (₹{formatCurrency(p.totalNet)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected Period Summary KPIs */}
      {activePeriod && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Gross Salary Commitment</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 financial-figure">
              {formatCurrency(activePeriod.totalGross)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Deductions</span>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1 financial-figure">
              {formatCurrency(activePeriod.totalDeductions)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Net Salary Disbursal</span>
            <div className="text-xl font-bold font-mono text-teal-800 mt-1 financial-figure">
              {formatCurrency(activePeriod.totalNet)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Staff Processed</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {activePeriod.payslipCount} Employees
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-600" /> Employee Payslip Breakdown
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {payslips.length} Payslips
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 w-28">Emp Code</th>
                <th className="py-2.5 px-4">Staff Member</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 text-right">Basic</th>
                <th className="py-2.5 px-4 text-right">HRA</th>
                <th className="py-2.5 px-4 text-right">Allowances</th>
                <th className="py-2.5 px-4 text-right">Gross Total</th>
                <th className="py-2.5 px-4 text-right">Deductions</th>
                <th className="py-2.5 px-4 text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading || isPayslipsLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                    Loading payroll records...
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No payroll run found for this cycle. Click "Run Payroll" above to generate.
                  </td>
                </tr>
              ) : (
                payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {ps.employeeCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {ps.employeeName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{ps.departmentName}</td>
                    <td className="py-3 px-4 text-right font-mono financial-figure">{formatCurrency(ps.basicSalary)}</td>
                    <td className="py-3 px-4 text-right font-mono financial-figure">{formatCurrency(ps.hra)}</td>
                    <td className="py-3 px-4 text-right font-mono financial-figure">{formatCurrency(ps.allowances)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 financial-figure">
                      {formatCurrency(ps.grossSalary)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 financial-figure">
                      {formatCurrency(ps.deductions)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-800 text-sm financial-figure">
                      {formatCurrency(ps.netSalary)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
