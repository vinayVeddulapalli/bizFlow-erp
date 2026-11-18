import { create } from 'zustand';
import { LocalProduct, LocalCustomer } from '../database/sqlite-client';
import { roundFinancial, toDecimal } from '@bizflow/shared-utils';

export interface CartItem {
  product: LocalProduct;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
}

interface CartState {
  items: CartItem[];
  customer: LocalCustomer | null;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;

  addItem: (product: LocalProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: LocalCustomer | null) => void;
  clearCart: () => void;
}

const calculateTotals = (items: CartItem[]) => {
  let subtotal = toDecimal(0);
  let taxTotal = toDecimal(0);

  for (const item of items) {
    subtotal = subtotal.plus(item.taxableAmount);
    taxTotal = taxTotal.plus(item.taxAmount);
  }

  const grandTotal = subtotal.plus(taxTotal);

  return {
    subtotal: roundFinancial(subtotal, 2).toNumber(),
    taxTotal: roundFinancial(taxTotal, 2).toNumber(),
    grandTotal: roundFinancial(grandTotal, 2).toNumber(),
  };
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customer: {
    id: 'c1',
    name: 'Walk-in Counter Customer',
    companyName: 'Retail Cash',
    phone: '9999999999',
    gstin: null,
    currentBalance: 0,
  },
  subtotal: 0,
  taxTotal: 0,
  grandTotal: 0,

  addItem: (product, qty = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      let newItems: CartItem[];

      if (existing) {
        newItems = state.items.map((i) => {
          if (i.product.id === product.id) {
            const newQty = i.quantity + qty;
            const taxable = toDecimal(product.salePrice).times(newQty);
            const tax = taxable.times(product.taxRate).dividedBy(100);
            return {
              ...i,
              quantity: newQty,
              taxableAmount: roundFinancial(taxable, 2).toNumber(),
              taxAmount: roundFinancial(tax, 2).toNumber(),
              lineTotal: roundFinancial(taxable.plus(tax), 2).toNumber(),
            };
          }
          return i;
        });
      } else {
        const taxable = toDecimal(product.salePrice).times(qty);
        const tax = taxable.times(product.taxRate).dividedBy(100);
        newItems = [
          ...state.items,
          {
            product,
            quantity: qty,
            unitPrice: product.salePrice,
            taxRate: product.taxRate,
            taxableAmount: roundFinancial(taxable, 2).toNumber(),
            taxAmount: roundFinancial(tax, 2).toNumber(),
            lineTotal: roundFinancial(taxable.plus(tax), 2).toNumber(),
          },
        ];
      }

      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }),

  removeItem: (productId) =>
    set((state) => {
      const newItems = state.items.filter((i) => i.product.id !== productId);
      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter((i) => i.product.id !== productId);
        const totals = calculateTotals(newItems);
        return { items: newItems, ...totals };
      }

      const newItems = state.items.map((i) => {
        if (i.product.id === productId) {
          const taxable = toDecimal(i.unitPrice).times(quantity);
          const tax = taxable.times(i.taxRate).dividedBy(100);
          return {
            ...i,
            quantity,
            taxableAmount: roundFinancial(taxable, 2).toNumber(),
            taxAmount: roundFinancial(tax, 2).toNumber(),
            lineTotal: roundFinancial(taxable.plus(tax), 2).toNumber(),
          };
        }
        return i;
      });

      const totals = calculateTotals(newItems);
      return { items: newItems, ...totals };
    }),

  setCustomer: (customer) => set({ customer }),

  clearCart: () =>
    set({
      items: [],
      subtotal: 0,
      taxTotal: 0,
      grandTotal: 0,
    }),
}));
