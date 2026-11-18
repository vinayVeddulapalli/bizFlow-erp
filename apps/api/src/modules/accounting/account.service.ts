import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAccountInput } from '@bizflow/validation';
import { DEFAULT_CHART_OF_ACCOUNTS } from './default-accounts';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultAccounts(organizationId: string) {
    const existingCount = await this.prisma.account.count({
      where: { organizationId },
    });

    if (existingCount === 0) {
      await this.prisma.account.createMany({
        data: DEFAULT_CHART_OF_ACCOUNTS.map((acc) => ({
          organizationId,
          code: acc.code,
          name: acc.name,
          category: acc.category,
          isSystem: acc.isSystem,
          currentBalance: 0,
        })),
      });
    }
  }

  async listAccounts(organizationId: string) {
    await this.ensureDefaultAccounts(organizationId);

    const accounts = await this.prisma.account.findMany({
      where: { organizationId, isActive: true },
      orderBy: { code: 'asc' },
      include: {
        children: true,
      },
    });

    return accounts.map((acc) => ({
      ...acc,
      currentBalance: acc.currentBalance.toString(),
    }));
  }

  async getAccountById(organizationId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, organizationId },
      include: { children: true },
    });

    if (!account) {
      throw new NotFoundException('Ledger account not found.');
    }

    return {
      ...account,
      currentBalance: account.currentBalance.toString(),
    };
  }

  async getAccountByCode(organizationId: string, code: string) {
    await this.ensureDefaultAccounts(organizationId);
    const account = await this.prisma.account.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found.`);
    }

    return account;
  }

  async getAccountLedger(organizationId: string, id: string) {
    const account = await this.getAccountById(organizationId, id);

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: id,
        journalEntry: {
          organizationId,
          status: 'POSTED',
        },
      },
      include: {
        journalEntry: true,
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { journalEntry: { createdAt: 'asc' } },
      ],
    });

    let runningBalance = toDecimal(0);
    const isDebitNormal =
      account.category === 'ASSET' || account.category === 'EXPENSE';

    const ledgerEntries = lines.map((line) => {
      const debit = toDecimal(line.debit.toString());
      const credit = toDecimal(line.credit.toString());

      if (isDebitNormal) {
        runningBalance = runningBalance.plus(debit).minus(credit);
      } else {
        runningBalance = runningBalance.plus(credit).minus(debit);
      }

      return {
        id: line.id,
        entryNumber: line.journalEntry.entryNumber,
        entryDate: line.journalEntry.entryDate,
        referenceType: line.journalEntry.referenceType,
        referenceId: line.journalEntry.referenceId,
        narration: line.journalEntry.narration,
        lineDescription: line.description,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        runningBalance: runningBalance.toFixed(2),
      };
    });

    return {
      account,
      entries: ledgerEntries,
      closingBalance: runningBalance.toFixed(2),
    };
  }

  async createAccount(organizationId: string, data: CreateAccountInput) {
    const existing = await this.prisma.account.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: data.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Account with code ${data.code} already exists.`);
    }

    return this.prisma.account.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        category: data.category,
        parentId: data.parentId || undefined,
        isSystem: false,
        currentBalance: data.openingBalance || 0,
      },
    });
  }
}
