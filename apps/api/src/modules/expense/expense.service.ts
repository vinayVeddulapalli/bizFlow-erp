import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { toDecimal, Decimal } from '@bizflow/shared-utils';

export interface CreateExpenseInput {
  categoryId: string;
  branchId?: string;
  expenseDate: string;
  amount: number;
  isGstClaimable?: boolean;
  vendorGstin?: string;
  vendorName?: string;
  gstRate?: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI';
  bankAccountId?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceUnit?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  notes?: string;
}

export interface CreateOtherIncomeInput {
  categoryId: string;
  incomeDate: string;
  amount: number;
  source: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI';
  bankAccountId?: string;
  notes?: string;
}

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService
  ) {}

  // ================= EXPENSE CATEGORIES =================
  async listCategories(organizationId: string) {
    let categories = await this.prisma.expenseCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });

    // Auto-seed default expense categories if none exist
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Rent & Premises', code: 'EXP-RENT', isTaxDeductible: true },
        { name: 'Electricity & Utilities', code: 'EXP-UTIL', isTaxDeductible: true },
        { name: 'Office Supplies & Stationery', code: 'EXP-OFFICE', isTaxDeductible: true },
        { name: 'Travel & Logistics', code: 'EXP-TRAVEL', isTaxDeductible: true },
        { name: 'Advertising & Marketing', code: 'EXP-MKT', isTaxDeductible: true },
        { name: 'IT Subscriptions & Software', code: 'EXP-IT', isTaxDeductible: true },
        { name: 'Repairs & Maintenance', code: 'EXP-MAINT', isTaxDeductible: true },
        { name: 'Miscellaneous Expenses', code: 'EXP-MISC', isTaxDeductible: true },
      ];

      for (const item of defaultCategories) {
        await this.prisma.expenseCategory.create({
          data: {
            organizationId,
            name: item.name,
            code: item.code,
            isTaxDeductible: item.isTaxDeductible,
          },
        });
      }

      categories = await this.prisma.expenseCategory.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
      });
    }

    return categories;
  }

  async createCategory(organizationId: string, data: { name: string; code?: string; isTaxDeductible?: boolean }) {
    return this.prisma.expenseCategory.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code || undefined,
        isTaxDeductible: data.isTaxDeductible !== undefined ? data.isTaxDeductible : true,
      },
    });
  }

  // ================= EXPENSE TRANSACTIONS =================
  async listExpenses(
    organizationId: string,
    query?: { categoryId?: string; isGstClaimable?: boolean; startDate?: string; endDate?: string }
  ) {
    return this.prisma.expense.findMany({
      where: {
        organizationId,
        ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query?.isGstClaimable !== undefined ? { isGstClaimable: query.isGstClaimable } : {}),
        ...(query?.startDate || query?.endDate
          ? {
              expenseDate: {
                ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
                ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async createExpense(organizationId: string, data: CreateExpenseInput) {
    let branchId = data.branchId;
    if (!branchId) {
      const defBranch = await this.prisma.branch.findFirst({ where: { organizationId } });
      branchId = defBranch?.id;
    }
    if (!branchId) {
      throw new NotFoundException('Branch not found');
    }

    const voucherNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'EXPENSE_VOUCHER',
      'EXP'
    );

    const totalAmount = toDecimal(data.amount);
    let cgstAmount = toDecimal(0);
    let sgstAmount = toDecimal(0);
    let igstAmount = toDecimal(0);

    if (data.isGstClaimable && data.gstRate && data.gstRate > 0) {
      const rate = toDecimal(data.gstRate);
      const taxAmount = totalAmount.times(rate).dividedBy(rate.plus(100)); // Inclusive tax derivation
      cgstAmount = taxAmount.dividedBy(2);
      sgstAmount = taxAmount.dividedBy(2);
    }

    return this.prisma.expense.create({
      data: {
        organizationId,
        categoryId: data.categoryId,
        branchId,
        expenseDate: new Date(data.expenseDate),
        voucherNumber,
        amount: totalAmount.toNumber(),
        isGstClaimable: !!data.isGstClaimable,
        vendorGstin: data.vendorGstin || undefined,
        vendorName: data.vendorName || undefined,
        gstRate: data.gstRate !== undefined ? data.gstRate : 0,
        cgstAmount: cgstAmount.toNumber(),
        sgstAmount: sgstAmount.toNumber(),
        igstAmount: igstAmount.toNumber(),
        paymentMode: data.paymentMode,
        bankAccountId: data.bankAccountId || undefined,
        receiptUrl: data.receiptUrl || undefined,
        isRecurring: !!data.isRecurring,
        recurrenceUnit: data.recurrenceUnit || undefined,
        notes: data.notes || undefined,
      },
      include: {
        category: true,
      },
    });
  }

  // ================= OTHER INCOME =================
  async listIncomeCategories(organizationId: string) {
    let categories = await this.prisma.otherIncomeCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Interest on Bank Deposits & FD' },
        { name: 'Scrap & Waste Material Sales' },
        { name: 'Commission & Referral Income' },
        { name: 'Dividend & Mutual Fund Yield' },
        { name: 'Foreign Exchange Gains' },
        { name: 'Miscellaneous Other Income' },
      ];

      for (const item of defaultCategories) {
        await this.prisma.otherIncomeCategory.create({
          data: {
            organizationId,
            name: item.name,
          },
        });
      }

      categories = await this.prisma.otherIncomeCategory.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
      });
    }

    return categories;
  }

  async createIncomeCategory(organizationId: string, data: { name: string }) {
    return this.prisma.otherIncomeCategory.create({
      data: {
        organizationId,
        name: data.name,
      },
    });
  }

  async listOtherIncome(organizationId: string) {
    return this.prisma.otherIncome.findMany({
      where: { organizationId },
      include: {
        category: true,
      },
      orderBy: { incomeDate: 'desc' },
    });
  }

  async createOtherIncome(organizationId: string, data: CreateOtherIncomeInput) {
    const voucherNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'INCOME_VOUCHER',
      'INC'
    );

    return this.prisma.otherIncome.create({
      data: {
        organizationId,
        categoryId: data.categoryId,
        incomeDate: new Date(data.incomeDate),
        voucherNumber,
        amount: toDecimal(data.amount).toNumber(),
        source: data.source,
        paymentMode: data.paymentMode,
        bankAccountId: data.bankAccountId || undefined,
        notes: data.notes || undefined,
      },
      include: {
        category: true,
      },
    });
  }

  // ================= EXPENSE & INCOME METRICS SUMMARY =================
  async getFinancialOverview(organizationId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { organizationId },
      include: { category: true },
    });

    const otherIncomes = await this.prisma.otherIncome.findMany({
      where: { organizationId },
    });

    let totalExpense = toDecimal(0);
    let totalGstClaimable = toDecimal(0);
    let totalItcAmount = toDecimal(0);
    let recurringCount = 0;

    const categoryMap = new Map<string, Decimal>();

    expenses.forEach((e) => {
      const amt = toDecimal(e.amount.toString());
      totalExpense = totalExpense.plus(amt);

      if (e.isGstClaimable) {
        totalGstClaimable = totalGstClaimable.plus(amt);
        const itc = toDecimal(e.cgstAmount.toString()).plus(toDecimal(e.sgstAmount.toString())).plus(toDecimal(e.igstAmount.toString()));
        totalItcAmount = totalItcAmount.plus(itc);
      }

      if (e.isRecurring) {
        recurringCount++;
      }

      const catName = e.category?.name || 'General';
      const prev = categoryMap.get(catName) || toDecimal(0);
      categoryMap.set(catName, prev.plus(amt));
    });

    let totalOtherIncome = toDecimal(0);
    otherIncomes.forEach((i) => {
      totalOtherIncome = totalOtherIncome.plus(toDecimal(i.amount.toString()));
    });

    let topCategory = 'None';
    let topCategoryAmount = toDecimal(0);
    categoryMap.forEach((amt, name) => {
      if (amt.greaterThan(topCategoryAmount)) {
        topCategoryAmount = amt;
        topCategory = name;
      }
    });

    return {
      totalExpense: totalExpense.toFixed(2),
      totalGstClaimable: totalGstClaimable.toFixed(2),
      totalItcAmount: totalItcAmount.toFixed(2),
      totalOtherIncome: totalOtherIncome.toFixed(2),
      netOperatingExpense: totalExpense.minus(totalOtherIncome).toFixed(2),
      topCategory,
      topCategoryAmount: topCategoryAmount.toFixed(2),
      expenseCount: expenses.length,
      incomeCount: otherIncomes.length,
      recurringCount,
    };
  }
}
