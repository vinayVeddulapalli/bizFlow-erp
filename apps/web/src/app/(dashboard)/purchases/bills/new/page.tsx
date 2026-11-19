'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../../../lib/api-client';
import { SupplierDto, BranchDto } from '@bizflow/shared-types';
import {
  calculateItemGst,
  toDecimal,
  formatCurrency,
} from '@bizflow/shared-utils';
import { Plus, Trash2, ArrowLeft, Loader2, ShoppingBag, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface LineItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
}

export default function NewPurchaseBillPage() {
  const router = useRouter();

  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res.data || [];
    },
  });

  const { data: suppliers = [] } = useQuery<SupplierDto[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchases/suppliers');
      return res.data || [];
    },
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierBillNo, setSupplierBillNo] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Raw Materials / Inventory Stock',
      hsnSacCode: '847130',
      quantity: 1,
      unitCost: 5000,
      taxRate: 18,
    },
  ]);

  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unitCost: 0,
        taxRate: 18,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Calculations
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const supplierState = selectedSupplier?.stateCode || '27';
  const branchState = selectedBranch?.stateCode || '27';
  const isIntraState = supplierState === branchState;

  let subtotal = toDecimal(0);
  let totalCgst = toDecimal(0);
  let totalSgst = toDecimal(0);
  let totalIgst = toDecimal(0);
  let totalTax = toDecimal(0);

  const calculatedLines = items.map((it) => {
    const calc = calculateItemGst({
      quantity: it.quantity,
      unitPrice: it.unitCost,
      taxRate: it.taxRate,
      isTaxInclusive: false,
      supplierStateCode: supplierState,
      placeOfSupplyStateCode: branchState,
    });

    subtotal = subtotal.plus(calc.taxableAmount);
    totalCgst = totalCgst.plus(calc.cgstAmount);
    totalSgst = totalSgst.plus(calc.sgstAmount);
    totalIgst = totalIgst.plus(calc.igstAmount);
    totalTax = totalTax.plus(calc.totalTaxAmount);

    return { ...it, calc };
  });

  const grandTotal = subtotal.plus(totalTax);

  const createMutation = useMutation({
    mutationFn: async (shouldPost: boolean) => {
      const payload = {
        branchId: selectedBranchId,
        supplierId: selectedSupplierId,
        supplierBillNo,
        billDate,
        dueDate,
        notes,
        items: items.map((it) => ({
          description: it.description,
          hsnSacCode: it.hsnSacCode || null,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          taxRate: Number(it.taxRate),
        })),
      };

      const res: any = await apiClient.post('/purchases/bills', payload);
      const createdBill = res.data;

      if (shouldPost && createdBill?.id) {
        await apiClient.post(`/purchases/bills/${createdBill.id}/post`);
      }

      return createdBill;
    },
    onSuccess: () => {
      router.push('/purchases/bills');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases/bills"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Record Vendor Purchase Bill</h1>
            <p className="text-xs text-slate-500">Record inbound supplies and input tax credits</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={createMutation.isPending || !selectedSupplierId || !supplierBillNo}
            onClick={() => createMutation.mutate(false)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={createMutation.isPending || !selectedSupplierId || !supplierBillNo}
            onClick={() => createMutation.mutate(true)}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            Save & Post Bill
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {createMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{(createMutation.error as any)?.message || 'Failed to save vendor bill. Ensure supplier, branch, and items are properly filled.'}</span>
        </div>
      )}

      {/* Meta Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Select Supplier *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Vendor Invoice / Bill # *
            </label>
            <input
              type="text"
              required
              value={supplierBillNo}
              onChange={(e) => setSupplierBillNo(e.target.value)}
              placeholder="e.g. APX-9982"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Receiving Branch *
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Bill Date
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Bill Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Purchased Item Lines
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item Line
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 min-w-[200px]">Description</th>
                <th className="py-3 px-3 w-28">HSN/SAC</th>
                <th className="py-3 px-3 w-24 text-right">Qty</th>
                <th className="py-3 px-3 w-28 text-right">Unit Cost (₹)</th>
                <th className="py-3 px-3 w-28 text-right">Taxable (₹)</th>
                <th className="py-3 px-3 w-24 text-right">Tax %</th>
                <th className="py-3 px-3 w-28 text-right">Tax (₹)</th>
                <th className="py-3 px-3 w-32 text-right">Total (₹)</th>
                <th className="py-3 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {calculatedLines.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4">
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                      placeholder="Item name / raw material"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={it.hsnSacCode}
                      onChange={(e) => updateItem(it.id, 'hsnSacCode', e.target.value)}
                      placeholder="847130"
                      className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateItem(it.id, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs text-right text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={it.unitCost}
                      onChange={(e) => updateItem(it.id, 'unitCost', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs text-right text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-600">
                    ₹{it.calc?.taxableAmount?.toString() || '0'}
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={it.taxRate}
                      onChange={(e) => updateItem(it.id, 'taxRate', Number(e.target.value))}
                      className="w-full px-1.5 py-1.5 rounded border border-slate-200 text-xs text-right text-slate-800 focus:outline-none focus:border-teal-500"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-600">
                    ₹{it.calc?.totalTaxAmount?.toString() || '0'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{it.calc?.totalAmount?.toString() || '0'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Totals HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Vendor / Internal Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional reference details..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2.5 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 pb-2 border-b border-slate-100">
            Bill Total Summary
          </h3>

          <div className="flex justify-between text-slate-600">
            <span>Taxable Amount:</span>
            <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
          </div>

          {isIntraState ? (
            <>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Input CGST:</span>
                <span className="font-mono">{formatCurrency(totalCgst)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Input SGST:</span>
                <span className="font-mono">{formatCurrency(totalSgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Input IGST:</span>
              <span className="font-mono">{formatCurrency(totalIgst)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2">
            <span>Total Input Tax Credit:</span>
            <span className="font-mono font-semibold">{formatCurrency(totalTax)}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-slate-900 bg-slate-100 p-3 rounded-lg mt-2">
            <span>Total Payable:</span>
            <span className="font-mono">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
