export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface AccountDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  category: AccountCategory;
  parentId?: string | null;
  isSystem: boolean;
  isActive: boolean;
  currentBalance: string | number;
  children?: AccountDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalEntryLineDto {
  id?: string;
  accountId: string;
  account?: {
    id: string;
    code: string;
    name: string;
    category: AccountCategory;
  };
  debit: string | number;
  credit: string | number;
  description?: string | null;
}

export interface JournalEntryDto {
  id: string;
  entryNumber: string;
  entryDate: string;
  status: JournalStatus;
  referenceType?: string | null;
  referenceId?: string | null;
  narration: string;
  totalDebit: string | number;
  totalCredit: string | number;
  postedAt: string;
  createdAt: string;
  lines: JournalEntryLineDto[];
}

export interface TrialBalanceAccountDto {
  accountId: string;
  code: string;
  name: string;
  category: AccountCategory;
  debit: string;
  credit: string;
}

export interface TrialBalanceReportDto {
  asOfDate: string;
  accounts: TrialBalanceAccountDto[];
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
}

export interface FinancialLineDto {
  accountId: string;
  code: string;
  name: string;
  amount: string;
}

export interface ProfitAndLossDto {
  fromDate: string;
  toDate: string;
  revenueAccounts: FinancialLineDto[];
  totalRevenue: string;
  expenseAccounts: FinancialLineDto[];
  totalExpense: string;
  netProfit: string;
}

export interface BalanceSheetDto {
  asOfDate: string;
  assetAccounts: FinancialLineDto[];
  totalAssets: string;
  liabilityAccounts: FinancialLineDto[];
  totalLiabilities: string;
  equityAccounts: FinancialLineDto[];
  retainedEarnings: string;
  totalEquity: string;
  totalLiabilitiesAndEquity: string;
  isBalanced: boolean;
}

export interface Gstr1B2bInvoiceDto {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  placeOfSupply: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

export interface Gstr1HsnItemDto {
  hsnSacCode: string;
  description: string;
  uqc: string;
  totalQuantity: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

export interface Gstr1ReportDto {
  fiscalYear: string;
  month: number;
  b2b: Gstr1B2bInvoiceDto[];
  b2cs: Array<{
    placeOfSupply: string;
    taxRate: string;
    taxableAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
    totalAmount: string;
  }>;
  hsnSummary: Gstr1HsnItemDto[];
  totals: {
    taxableAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
    totalTax: string;
    invoiceValue: string;
  };
}

export interface Gstr3bReportDto {
  fiscalYear: string;
  month: number;
  outwardSupplies: {
    taxableAmount: string;
    igstAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    totalTax: string;
  };
  eligibleItc: {
    igstAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    totalItc: string;
  };
  netTaxPayable: {
    igstAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    totalPayable: string;
  };
}
