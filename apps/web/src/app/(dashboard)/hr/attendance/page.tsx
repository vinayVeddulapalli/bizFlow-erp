'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import {
  Calendar,
  Users,
  Save,
  CheckCheck,
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

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'>>({});

  // Fetch attendance
  const { data: records = [], isLoading } = useQuery<AttendanceRow[]>({
    queryKey: ['hr-attendance', selectedDate],
    queryFn: async () => {
      const res: any = await apiClient.get(`/hr/attendance?date=${selectedDate}`);
      const data: AttendanceRow[] = res.data;
      const initialMap: Record<string, any> = {};
      data.forEach((r) => {
        initialMap[r.employeeId] = r.status;
      });
      setLocalStatuses(initialMap);
      return data;
    },
  });

  // Bulk save mutation
  const saveMutation = useMutation({
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
      alert('Attendance records saved successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save attendance.');
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

  const presentCount = Object.values(localStatuses).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(localStatuses).filter((s) => s === 'ABSENT').length;
  const leaveCount = Object.values(localStatuses).filter((s) => s === 'LEAVE' || s === 'HALF_DAY').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Staff Attendance Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            Log employee daily presence, leaves, and calculate monthly payroll attendance factors
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" /> Employee Directory
          </Link>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Date Bar & Metrics */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-700">Roster Date:</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
          <button
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Mark All Present
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-emerald-700 font-bold">Present: {presentCount}</span>
          <span className="text-rose-700 font-bold">Absent: {absentCount}</span>
          <span className="text-amber-700 font-bold">Leave/Half: {leaveCount}</span>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-28">Emp Code</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    Loading attendance roster...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No active staff members found. Add employees in the Employee Directory first.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const currentStatus = localStatuses[r.employeeId] || 'PRESENT';

                  return (
                    <tr key={r.employeeId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {r.employeeCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {r.fullName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {r.departmentName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
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
                                    : 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              {st === 'PRESENT' && 'P'}
                              {st === 'ABSENT' && 'A'}
                              {st === 'HALF_DAY' && 'HD'}
                              {st === 'LEAVE' && 'L'}
                            </button>
                          ))}
                        </div>
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
  );
}
