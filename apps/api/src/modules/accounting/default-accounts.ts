import { AccountCategory } from '@prisma/client';

export interface DefaultAccountDefinition {
  code: string;
  name: string;
  category: AccountCategory;
  isSystem: boolean;
  parentCode?: string;
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountDefinition[] = [
  // ASSETS (1000 - 1999)
  { code: '1110', name: 'Cash on Hand', category: AccountCategory.ASSET, isSystem: true },
  { code: '1120', name: 'Bank Accounts', category: AccountCategory.ASSET, isSystem: true },
  { code: '1200', name: 'Accounts Receivable (Sundry Debtors)', category: AccountCategory.ASSET, isSystem: true },
  { code: '1300', name: 'Inventory Asset', category: AccountCategory.ASSET, isSystem: true },
  { code: '1410', name: 'Input CGST Credit', category: AccountCategory.ASSET, isSystem: true },
  { code: '1420', name: 'Input SGST Credit', category: AccountCategory.ASSET, isSystem: true },
  { code: '1430', name: 'Input IGST Credit', category: AccountCategory.ASSET, isSystem: true },
  { code: '1500', name: 'Prepaid Expenses & Advances', category: AccountCategory.ASSET, isSystem: false },
  { code: '1800', name: 'Fixed Assets (Equipment & Furniture)', category: AccountCategory.ASSET, isSystem: false },

  // LIABILITIES (2000 - 2999)
  { code: '2100', name: 'Accounts Payable (Sundry Creditors)', category: AccountCategory.LIABILITY, isSystem: true },
  { code: '2210', name: 'Output CGST Payable', category: AccountCategory.LIABILITY, isSystem: true },
  { code: '2220', name: 'Output SGST Payable', category: AccountCategory.LIABILITY, isSystem: true },
  { code: '2230', name: 'Output IGST Payable', category: AccountCategory.LIABILITY, isSystem: true },
  { code: '2300', name: 'Short-term Borrowings & Overdraft', category: AccountCategory.LIABILITY, isSystem: false },
  { code: '2400', name: 'Duties & Taxes Payable', category: AccountCategory.LIABILITY, isSystem: false },
  { code: '2500', name: 'Salaries & Wages Payable', category: AccountCategory.LIABILITY, isSystem: false },

  // EQUITY (3000 - 3999)
  { code: '3100', name: "Owner's Capital / Share Capital", category: AccountCategory.EQUITY, isSystem: true },
  { code: '3200', name: 'Retained Earnings', category: AccountCategory.EQUITY, isSystem: true },
  { code: '3300', name: 'Opening Balance Equity', category: AccountCategory.EQUITY, isSystem: true },

  // REVENUE (4000 - 4999)
  { code: '4100', name: 'Sales Revenue', category: AccountCategory.REVENUE, isSystem: true },
  { code: '4200', name: 'Service Revenue', category: AccountCategory.REVENUE, isSystem: false },
  { code: '4300', name: 'Other Operating Income', category: AccountCategory.REVENUE, isSystem: false },
  { code: '4400', name: 'Discounts Received', category: AccountCategory.REVENUE, isSystem: false },

  // EXPENSES (5000 - 5999)
  { code: '5100', name: 'Cost of Goods Sold (COGS)', category: AccountCategory.EXPENSE, isSystem: true },
  { code: '5200', name: 'Purchase Expense', category: AccountCategory.EXPENSE, isSystem: true },
  { code: '5300', name: 'Freight & Delivery Inward', category: AccountCategory.EXPENSE, isSystem: false },
  { code: '5400', name: 'Salaries & Staff Expenses', category: AccountCategory.EXPENSE, isSystem: false },
  { code: '5500', name: 'Rent & Office Lease', category: AccountCategory.EXPENSE, isSystem: false },
  { code: '5600', name: 'Utilities & Electricity', category: AccountCategory.EXPENSE, isSystem: false },
  { code: '5700', name: 'Office & Administrative Expense', category: AccountCategory.EXPENSE, isSystem: false },
  { code: '5800', name: 'Bank Charges & Processing Fees', category: AccountCategory.EXPENSE, isSystem: false },
];
