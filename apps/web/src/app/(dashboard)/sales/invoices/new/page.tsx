'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../../../lib/api-client';
import { CustomerDto, BranchDto } from '@bizflow/shared-types';
import {
  calculateItemGst,
  calculateRoundOff,
  toDecimal,
  formatCurrency,
  INDIAN_STATES,
} from '@bizflow/shared-utils';
import { Plus, Trash2, ArrowLeft, Loader2, Receipt, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface LineItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // 1. Fetch Branches
  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res.data || [];
    },
  });

  // 2. Fetch Customers
  const { data: customers = [] } = useQuery<CustomerDto[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/customers');
      return res.data || [];
    },
  });

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('27');
  const [notes, setNotes] = useState<string>('Thank you for your business!');
  const [terms, setTerms] = useState<string>('Payment due within 15 days of invoice date.');

  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Consulting Services / Goods Item',
      hsnSacCode: '998311',
      quantity: 1,
      unitPrice: 10000,
      discountPct: 0,
      taxRate: 18,
    },
  ]);

  // Set default branch when loaded
  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Update place of supply when customer changes
  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setPlaceOfSupply(c.stateCode);
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unitPrice: 0,
        discountPct: 0,
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

  // Real-Time Calculations
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const supplierState = selectedBranch?.stateCode || '27';
  const isIntraState = supplierState === placeOfSupply;

  let subtotal = toDecimal(0);
  let totalCgst = toDecimal(0);
  let totalSgst = toDecimal(0);
  let totalIgst = toDecimal(0);
  let totalTax = toDecimal(0);

  const calculatedLines = items.map((it) => {
    const calc = calculateItemGst({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPct: it.discountPct,
      taxRate: it.taxRate,
      isTaxInclusive: false,
      supplierStateCode: supplierState,
      placeOfSupplyStateCode: placeOfSupply,
    });

    subtotal = subtotal.plus(calc.taxableAmount);
    totalCgst = totalCgst.plus(calc.cgstAmount);
    totalSgst = totalSgst.plus(calc.sgstAmount);
    totalIgst = totalIgst.plus(calc.igstAmount);
    totalTax = totalTax.plus(calc.totalTaxAmount);

    return { ...it, calc };
  });

  const exactTotal = subtotal.plus(totalTax);
  const { roundedTotal, roundOffAmount } = calculateRoundOff(exactTotal);

  // Submit Mutation
  const createMutation = useMutation({
    mutationFn: async (shouldPost: boolean) => {
      const payload = {
        branchId: selectedBranchId,
        customerId: selectedCustomerId,
        invoiceDate,
        dueDate,
        placeOfSupply,
        notes,
        terms,
        items: items.map((it) => ({
          description: it.description,
          hsnSacCode: it.hsnSacCode || null,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountPct: Number(it.discountPct || 0),
          taxRate: Number(it.taxRate),
        })),
      };

      const res: any = await apiClient.post('/sales/invoices', payload);
      const createdInvoice = res.data;

      if (shouldPost && createdInvoice?.id) {
        await apiClient.post(`/sales/invoices/${createdInvoice.id}/post`);
      }

      return createdInvoice;
    },
    onSuccess: () => {
      router.push('/sales/invoices');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">New Tax Invoice</h1>
            <p className="text-xs text-slate-500">Live GST distribution & decimal exact billing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={createMutation.isPending || !selectedCustomerId}
            onClick={() => createMutation.mutate(false)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={createMutation.isPending || !selectedCustomerId}
            onClick={() => createMutation.mutate(true)}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
            Save & Post Invoice
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {createMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{(createMutation.error as any)?.message || 'Failed to save invoice. Ensure customer, branch, and line items are properly filled.'}</span>
        </div>
      )}

      {/* Invoice Meta Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Select Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Operating Branch *
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
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
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

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Place of Supply (GST)
            </label>
            <select
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            >
              {Object.values(INDIAN_STATES).map((st) => (
                <option key={st.code} value={st.code}>
                  {st.code} - {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
          <span>Tax Engine Detection:</span>
          <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            {isIntraState
              ? 'Intra-State Supply (CGST 50% + SGST 50%)'
              : 'Inter-State Supply (IGST 100%)'}
          </span>
        </div>
      </div>

      {/* Invoice Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Invoice Line Items
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
                <th className="py-3 px-4 min-w-[200px]">Item Description</th>
                <th className="py-3 px-3 w-28">HSN/SAC</th>
                <th className="py-3 px-3 w-24 text-right">Qty</th>
                <th className="py-3 px-3 w-28 text-right">Price (₹)</th>
                <th className="py-3 px-3 w-28 text-right">Taxable (₹)</th>
                <th className="py-3 px-3 w-24 text-right">GST %</th>
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
                      placeholder="Item name / service description"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={it.hsnSacCode}
                      onChange={(e) => updateItem(it.id, 'hsnSacCode', e.target.value)}
                      placeholder="998311"
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
                      value={it.unitPrice}
                      onChange={(e) => updateItem(it.id, 'unitPrice', Number(e.target.value))}
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

      {/* Invoice Totals HUD & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Notes & Terms */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Customer Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Financial Calculation HUD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 pb-2 border-b border-slate-100">
            Payment Summary
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Taxable Value):</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {isIntraState ? (
              <>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>CGST (Central Tax):</span>
                  <span className="font-mono">{formatCurrency(totalCgst)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>SGST (State Tax):</span>
                  <span className="font-mono">{formatCurrency(totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>IGST (Integrated Tax):</span>
                <span className="font-mono">{formatCurrency(totalIgst)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2">
              <span>Total Tax:</span>
              <span className="font-mono font-semibold">{formatCurrency(totalTax)}</span>
            </div>

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Round Off:</span>
              <span className="font-mono">{formatCurrency(roundOffAmount)}</span>
            </div>

            <div className="flex justify-between text-base font-bold text-teal-800 bg-teal-50 p-3 rounded-lg border border-teal-200 mt-2">
              <span>Grand Total:</span>
              <span className="font-mono">{formatCurrency(roundedTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
