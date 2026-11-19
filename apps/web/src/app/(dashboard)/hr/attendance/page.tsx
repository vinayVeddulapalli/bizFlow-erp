'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import {
  Calendar,
  Users,
  Save,
  CheckCheck,
  CalendarDays,
  User,
  Clock,
  BarChart3,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

interface AttendanceRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

interface EmployeeItem {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  designationName: string;
}

interface DayRecord {
  date: string;
  dayNumber: number;
  dayOfWeek: string;
  isWeekend: boolean;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  hasExplicitRecord: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

interface EmployeeMonthlyAttendanceData {
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    departmentName: string;
    designationName: string;
    joiningDate: string;
  };
  month: number;
  year: number;
  daysInMonth: number;
  summary: {
    totalDays: number;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    effectivePresent: number;
    attendancePercentage: string;
  };
  records: DayRecord[];
}

interface MonthlySummaryItem {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  totalDays: number;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  attendancePercentage: string;
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'daily' | 'employee-monthly' | 'all-monthly'>('daily');

  // Daily View State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'>>({});

  // Monthly View State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // 1. Fetch Employees list for dropdowns
  const { data: employees = [] } = useQuery<EmployeeItem[]>({
    queryKey: ['hr-employees-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/employees');
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (data.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(data[0].id);
      }
      return data;
    },
  });

  // Set default employee when list loads
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  // 2. Fetch Daily Attendance Records
  const { data: records = [], isLoading: isDailyLoading } = useQuery<AttendanceRow[]>({
    queryKey: ['hr-attendance', selectedDate],
    queryFn: async () => {
      const res: any = await apiClient.get(`/hr/attendance?date=${selectedDate}`);
      const data: AttendanceRow[] = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      const initialMap: Record<string, any> = {};
      data.forEach((r) => {
        initialMap[r.employeeId] = r.status;
      });
      setLocalStatuses(initialMap);
      return data;
    },
  });

  // 3. Fetch Specific Employee Monthly Attendance
  const targetEmployeeId = selectedEmployeeId || (employees.length > 0 ? employees[0].id : '');
  const { data: monthlyData, isLoading: isMonthlyLoading } = useQuery<EmployeeMonthlyAttendanceData>({
    queryKey: ['hr-monthly-attendance', targetEmployeeId, selectedMonth, selectedYear],
    enabled: !!targetEmployeeId && activeTab === 'employee-monthly',
    queryFn: async () => {
      const res: any = await apiClient.get(
        `/hr/attendance/employee/${targetEmployeeId}?month=${selectedMonth}&year=${selectedYear}`
      );
      return res.data || res;
    },
  });

  // 4. Fetch All Staff Monthly Overview
  const { data: monthlyOverview = [], isLoading: isOverviewLoading } = useQuery<MonthlySummaryItem[]>({
    queryKey: ['hr-monthly-overview', selectedMonth, selectedYear],
    enabled: activeTab === 'all-monthly',
    queryFn: async () => {
      const res: any = await apiClient.get(
        `/hr/attendance/monthly-summary?month=${selectedMonth}&year=${selectedYear}`
      );
      return Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
    },
  });

  // Bulk save daily mutation
  const saveDailyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date: selectedDate,
        records: Object.entries(localStatuses).map(([employeeId, status]) => ({
          employeeId,
          status,
        })),
      };
      return apiClient.post('/hr/attendance/bulk', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-attendance', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['hr-monthly-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr-monthly-overview'] });
      alert('Daily attendance records saved successfully.');
    },
    onError: (err: any) => {
      alert(err.message || err.response?.data?.message || 'Failed to save attendance.');
    },
  });

  // Single day status change mutation (from monthly timesheet)
  const logSingleAttendanceMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; date: string; status: string }) => {
      return apiClient.post('/hr/attendance', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-monthly-attendance', targetEmployeeId, selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['hr-monthly-overview', selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['hr-attendance'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update attendance record.');
    },
  });

  const handleMarkAllPresent = () => {
    const updated: Record<string, any> = {};
    records.forEach((r) => {
      updated[r.employeeId] = 'PRESENT';
    });
    setLocalStatuses(updated);
  };

  const handleStatusChange = (employeeId: string, status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE') => {
    setLocalStatuses((prev) => ({ ...prev, [employeeId]: status }));
  };

  const getMonthName = (m: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || `Month ${m}`;
  };

  const openEmployeeMonthly = (empId: string) => {
    setSelectedEmployeeId(empId);
    setActiveTab('employee-monthly');
  };

  const presentCount = Object.values(localStatuses).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(localStatuses).filter((s) => s === 'ABSENT').length;
  const leaveCount = Object.values(localStatuses).filter((s) => s === 'LEAVE' || s === 'HALF_DAY').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-teal-600" /> Staff Attendance & Timesheets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log employee daily presence, inspect detailed monthly timesheets, and track attendance percentage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" /> Employee Directory
          </Link>
          <Link
            href="/hr/payroll"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition"
          >
            <Clock className="w-3.5 h-3.5 text-teal-600" /> Payroll Processing
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'daily'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Daily Staff Roster
        </button>

        <button
          onClick={() => setActiveTab('employee-monthly')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'employee-monthly'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" /> Employee Monthly Timesheet
        </button>

        <button
          onClick={() => setActiveTab('all-monthly')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'all-monthly'
              ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> All Staff Monthly Summary
        </button>
      </div>

      {/* ================= TAB 1: DAILY ROSTER ================= */}
      {activeTab === 'daily' && (
        <div className="space-y-5">
          {/* Daily Date Bar & Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-700">Roster Date:</span>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-semibold outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
              <button
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Mark All Present
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Present: {presentCount}
                </span>
                <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  Absent: {absentCount}
                </span>
                <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                  Leave/Half: {leaveCount}
                </span>
              </div>

              <button
                onClick={() => saveDailyMutation.mutate()}
                disabled={saveDailyMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saveDailyMutation.isPending ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-28">Emp Code</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Daily Status (P / A / HD / L)</th>
                    <th className="py-3 px-4 text-right">Monthly Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isDailyLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                        Loading daily attendance roster...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No active staff members found. Add employees in the Employee Directory first.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const currentStatus = localStatuses[r.employeeId] || 'PRESENT';

                      return (
                        <tr key={r.employeeId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {r.employeeCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {r.fullName}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {r.departmentName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs shadow-xs">
                              {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(r.employeeId, st)}
                                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                                    currentStatus === st
                                      ? st === 'PRESENT'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : st === 'ABSENT'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : st === 'HALF_DAY'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-blue-600 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  {st === 'PRESENT' && 'P (Present)'}
                                  {st === 'ABSENT' && 'A (Absent)'}
                                  {st === 'HALF_DAY' && 'HD (Half)'}
                                  {st === 'LEAVE' && 'L (Leave)'}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openEmployeeMonthly(r.employeeId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition"
                            >
                              <span>View Month</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: EMPLOYEE MONTHLY TIMESHEET ================= */}
      {activeTab === 'employee-monthly' && (
        <div className="space-y-6">
          {/* Employee & Month Picker Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-700">Select Employee:</span>
              </div>
              <select
                value={targetEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} — {emp.fullName} ({emp.departmentName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-700">Month & Year:</span>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
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
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {isMonthlyLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-medium">
              Loading employee monthly timesheet...
            </div>
          ) : !monthlyData ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              No attendance data found for this employee.
            </div>
          ) : (
            <>
              {/* Employee Bio Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-base shadow-sm">
                    {monthlyData.employee.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{monthlyData.employee.fullName}</h2>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-400 font-mono text-xs font-bold border border-slate-700">
                        {monthlyData.employee.employeeCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {monthlyData.employee.designationName} • {monthlyData.employee.departmentName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Attendance Rate</span>
                    <span className="text-xl font-bold font-mono text-teal-400">
                      {monthlyData.summary.attendancePercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly KPI Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Days</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {monthlyData.summary.totalDays} Days
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Full calendar cycle</span>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Days Present</span>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {monthlyData.summary.present}
                  </div>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Full working shifts</span>
                </div>

                <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs bg-rose-50/20">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase block">Days Absent</span>
                  <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                    {monthlyData.summary.absent}
                  </div>
                  <span className="text-[10px] text-rose-600 block mt-0.5">Unexcused absence</span>
                </div>

                <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs bg-amber-50/20">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase block">Half Days</span>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {monthlyData.summary.halfDay}
                  </div>
                  <span className="text-[10px] text-amber-600 block mt-0.5">0.5 factor logged</span>
                </div>

                <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-xs bg-blue-50/20">
                  <span className="text-[11px] font-semibold text-blue-700 uppercase block">Approved Leaves</span>
                  <div className="text-xl font-bold font-mono text-blue-700 mt-1">
                    {monthlyData.summary.leave}
                  </div>
                  <span className="text-[10px] text-blue-600 block mt-0.5">Paid/casual leaves</span>
                </div>
              </div>

              {/* Day-by-Day Monthly Register Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    Complete Daily Attendance Register — {getMonthName(monthlyData.month)} {monthlyData.year}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {monthlyData.records.length} Days Tracked
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-4 w-32">Date</th>
                        <th className="py-2.5 px-4 w-28">Day</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Check-In</th>
                        <th className="py-2.5 px-4">Check-Out</th>
                        <th className="py-2.5 px-4">Hours</th>
                        <th className="py-2.5 px-4">Notes</th>
                        <th className="py-2.5 px-4 text-right">Adjust Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {monthlyData.records.map((day) => {
                        const isSunday = day.dayOfWeek === 'Sunday';

                        let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        if (day.status === 'ABSENT') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                        else if (day.status === 'HALF_DAY') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        else if (day.status === 'LEAVE') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';

                        return (
                          <tr
                            key={day.date}
                            className={`transition hover:bg-slate-50/80 ${
                              isSunday ? 'bg-slate-50/40 text-slate-400' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                              {day.date}
                            </td>
                            <td className="py-2.5 px-4 font-medium">
                              <span className={isSunday ? 'text-rose-500 font-bold' : 'text-slate-700'}>
                                {day.dayOfWeek}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                                {day.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {day.status === 'PRESENT' || day.status === 'HALF_DAY' ? day.checkInTime || '09:30 AM' : '—'}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {day.status === 'PRESENT' ? day.checkOutTime || '06:30 PM' : day.status === 'HALF_DAY' ? '01:30 PM' : '—'}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {day.status === 'PRESENT' ? '9.0 hrs' : day.status === 'HALF_DAY' ? '4.5 hrs' : '0.0 hrs'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 italic">
                              {day.notes || (isSunday ? 'Weekly Holiday' : 'Regular Shift')}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex rounded border border-slate-200 p-0.5 bg-white text-[10px]">
                                {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map((st) => (
                                  <button
                                    key={st}
                                    onClick={() =>
                                      logSingleAttendanceMutation.mutate({
                                        employeeId: targetEmployeeId,
                                        date: day.date,
                                        status: st,
                                      })
                                    }
                                    title={`Set as ${st}`}
                                    className={`px-1.5 py-0.5 rounded font-bold transition ${
                                      day.status === st
                                        ? st === 'PRESENT'
                                          ? 'bg-emerald-600 text-white'
                                          : st === 'ABSENT'
                                          ? 'bg-rose-600 text-white'
                                          : st === 'HALF_DAY'
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-slate-800'
                                    }`}
                                  >
                                    {st[0]}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= TAB 3: ALL STAFF MONTHLY SUMMARY ================= */}
      {activeTab === 'all-monthly' && (
        <div className="space-y-5">
          {/* Month/Year Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Organization Attendance Overview</h2>
              <p className="text-xs text-slate-500">Monthly attendance factors aggregated across all active employees</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
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
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {/* Master Monthly Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-28">Emp Code</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Cycle Days</th>
                    <th className="py-3 px-4 text-center text-emerald-700">Present</th>
                    <th className="py-3 px-4 text-center text-rose-700">Absent</th>
                    <th className="py-3 px-4 text-center text-amber-700">Half Days</th>
                    <th className="py-3 px-4 text-center text-blue-700">Leaves</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                    <th className="py-3 px-4 text-right">Timesheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isOverviewLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        Loading monthly attendance overview...
                      </td>
                    </tr>
                  ) : monthlyOverview.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No active employees found.
                      </td>
                    </tr>
                  ) : (
                    monthlyOverview.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {item.employeeCode}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.fullName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.departmentName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {item.totalDays}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                          {item.present}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                          {item.absent}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">
                          {item.halfDay}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-blue-600">
                          {item.leave}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-teal-800">
                          <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                            {item.attendancePercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEmployeeMonthly(item.employeeId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
                          >
                            <span>Open Timesheet</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
