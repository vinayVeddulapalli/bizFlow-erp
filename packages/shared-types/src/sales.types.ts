export type PartyType = 'UNREGISTERED' | 'REGULAR' | 'COMPOSITION' | 'CONSUMER' | 'OVERSEAS';
export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface CustomerDto {
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
  shippingAddress?: string | null;
  creditLimit: string;
  currentBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceItemDto {
  id?: string;
  productId?: string | null;
  description: string;
  hsnSacCode?: string | null;
  quantity: string | number;
  unitPrice: string | number;
  discountPct?: string | number;
  discountAmount?: string | number;
  taxRate: string | number;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

export interface SalesInvoiceDto {
  id: string;
  organizationId: string;
  branchId: string;
  branchName?: string;
  customerId: string;
  customerName?: string;
  customerGstin?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotalAmount: string;
  discountAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTaxAmount: string;
  roundOffAmount: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  placeOfSupply: string;
  notes?: string | null;
  terms?: string | null;
  postedAt?: string | null;
  createdAt: string;
  items?: SalesInvoiceItemDto[];
}

export interface PaymentReceiptDto {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string;
  receiptNumber: string;
  paymentDate: string;
  paymentMode: string;
  amount: string;
  referenceNo?: string | null;
  notes?: string | null;
  createdAt: string;
}
