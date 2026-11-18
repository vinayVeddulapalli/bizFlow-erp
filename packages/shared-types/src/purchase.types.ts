import { PartyType, InvoiceStatus } from './sales.types';

export interface SupplierDto {
  id: string;
  organizationId: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  partyType: PartyType;
  state: string;
  stateCode: string;
  billingAddress: string;
  currentBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceItemDto {
  id?: string;
  productId?: string | null;
  description: string;
  hsnSacCode?: string | null;
  quantity: string | number;
  unitCost: string | number;
  taxRate: string | number;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

export interface PurchaseInvoiceDto {
  id: string;
  organizationId: string;
  branchId: string;
  supplierId: string;
  supplierName?: string;
  billNumber: string;
  supplierBillNo: string;
  billDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotalAmount: string;
  discountAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTaxAmount: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  notes?: string | null;
  postedAt?: string | null;
  createdAt: string;
  items?: PurchaseInvoiceItemDto[];
}
