import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccountService } from './account.service';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class FinancialReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService
  ) {}

  async getTrialBalance(organizationId: string) {
    await this.accountService.ensureDefaultAccounts(organizationId);

    const accounts = await this.prisma.account.findMany({
      where: { organizationId, isActive: true },
      orderBy: { code: 'asc' },
    });

    let totalDebit = toDecimal(0);
    let totalCredit = toDecimal(0);

    const accountRows = accounts.map((acc) => {
      const balance = toDecimal(acc.currentBalance.toString());
      let debit = '0.00';
      let credit = '0.00';

      if (acc.category === 'ASSET' || acc.category === 'EXPENSE') {
        if (balance.gte(0)) {
          debit = balance.toFixed(2);
          totalDebit = totalDebit.plus(balance);
        } else {
          credit = balance.abs().toFixed(2);
          totalCredit = totalCredit.plus(balance.abs());
        }
      } else {
        if (balance.gte(0)) {
          credit = balance.toFixed(2);
          totalCredit = totalCredit.plus(balance);
        } else {
          debit = balance.abs().toFixed(2);
          totalDebit = totalDebit.plus(balance.abs());
        }
      }

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category,
        debit,
        credit,
      };
    });

    const isBalanced = totalDebit.minus(totalCredit).abs().lte(0.01);

    return {
      asOfDate: new Date().toISOString(),
      accounts: accountRows,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      isBalanced,
    };
  }

  async getProfitAndLoss(organizationId: string) {
    await this.accountService.ensureDefaultAccounts(organizationId);

    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        isActive: true,
        category: { in: ['REVENUE', 'EXPENSE'] },
      },
      orderBy: { code: 'asc' },
    });

    let totalRevenue = toDecimal(0);
    let totalExpense = toDecimal(0);

    const revenueAccounts: Array<{ accountId: string; code: string; name: string; amount: string }> = [];
    const expenseAccounts: Array<{ accountId: string; code: string; name: string; amount: string }> = [];

    for (const acc of accounts) {
      const bal = toDecimal(acc.currentBalance.toString());
      if (acc.category === 'REVENUE') {
        totalRevenue = totalRevenue.plus(bal);
        revenueAccounts.push({
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: bal.toFixed(2),
        });
      } else {
        totalExpense = totalExpense.plus(bal);
        expenseAccounts.push({
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: bal.toFixed(2),
        });
      }
    }

    const netProfit = totalRevenue.minus(totalExpense);

    return {
      fromDate: new Date(new Date().getFullYear(), 3, 1).toISOString(), // Indian Fiscal Year April 1
      toDate: new Date().toISOString(),
      revenueAccounts,
      totalRevenue: totalRevenue.toFixed(2),
      expenseAccounts,
      totalExpense: totalExpense.toFixed(2),
      netProfit: netProfit.toFixed(2),
    };
  }

  async getBalanceSheet(organizationId: string) {
    await this.accountService.ensureDefaultAccounts(organizationId);

    const [accounts, pnl] = await Promise.all([
      this.prisma.account.findMany({
        where: {
          organizationId,
          isActive: true,
          category: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
        },
        orderBy: { code: 'asc' },
      }),
      this.getProfitAndLoss(organizationId),
    ]);

    let totalAssets = toDecimal(0);
    let totalLiabilities = toDecimal(0);
    let totalEquity = toDecimal(0);

    const assetAccounts: Array<{ accountId: string; code: string; name: string; amount: string }> = [];
    const liabilityAccounts: Array<{ accountId: string; code: string; name: string; amount: string }> = [];
    const equityAccounts: Array<{ accountId: string; code: string; name: string; amount: string }> = [];

    for (const acc of accounts) {
      const bal = toDecimal(acc.currentBalance.toString());
      if (acc.category === 'ASSET') {
        totalAssets = totalAssets.plus(bal);
        assetAccounts.push({
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: bal.toFixed(2),
        });
      } else if (acc.category === 'LIABILITY') {
        totalLiabilities = totalLiabilities.plus(bal);
        liabilityAccounts.push({
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: bal.toFixed(2),
        });
      } else if (acc.category === 'EQUITY') {
        totalEquity = totalEquity.plus(bal);
        equityAccounts.push({
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: bal.toFixed(2),
        });
      }
    }

    // Add Net Profit to Equity
    const netProfitDecimal = toDecimal(pnl.netProfit);
    const finalEquity = totalEquity.plus(netProfitDecimal);
    const totalLiabilitiesAndEquity = totalLiabilities.plus(finalEquity);

    const isBalanced = totalAssets.minus(totalLiabilitiesAndEquity).abs().lte(0.01);

    return {
      asOfDate: new Date().toISOString(),
      assetAccounts,
      totalAssets: totalAssets.toFixed(2),
      liabilityAccounts,
      totalLiabilities: totalLiabilities.toFixed(2),
      equityAccounts,
      retainedEarnings: netProfitDecimal.toFixed(2),
      totalEquity: finalEquity.toFixed(2),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toFixed(2),
      isBalanced,
    };
  }
}
