export interface AgingInvoiceItem {
  id: string;
  invoiceNumber: string;
  partyName: string;
  date: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: string;
  dueAmount: string;
}

export interface AgingBucketDto {
  range: string;
  amount: string;
  invoiceCount: number;
  invoices: AgingInvoiceItem[];
}

export interface AgingAnalysisReportDto {
  reportType: 'RECEIVABLES' | 'PAYABLES';
  totalOutstanding: string;
  buckets: {
    current: AgingBucketDto;
    days1to30: AgingBucketDto;
    days31to60: AgingBucketDto;
    days61to90: AgingBucketDto;
    days90Plus: AgingBucketDto;
  };
}

export interface StockValuationItemDto {
  productId: string;
  name: string;
  sku: string | null;
  categoryName: string;
  uom: string;
  totalQuantity: string;
  unitCost: string;
  totalValuation: string;
}

export interface StockValuationReportDto {
  asOfDate: string;
  totalItems: number;
  totalQuantity: string;
  totalValuation: string;
  items: StockValuationItemDto[];
}

export interface RegisterTransactionDto {
  id: string;
  date: string;
  documentNumber: string;
  partyName: string;
  partyGstin?: string | null;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTax: string;
  totalAmount: string;
  status: string;
}

export interface BusinessRegisterReportDto {
  registerType: 'SALES' | 'PURCHASE';
  fromDate: string;
  toDate: string;
  totalTaxable: string;
  totalTax: string;
  totalAmount: string;
  transactions: RegisterTransactionDto[];
}
