import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { AccountService } from './account.service';
import { CreateJournalEntryInput } from '@bizflow/validation';
import { toDecimal } from '@bizflow/shared-utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService,
    private readonly accountService: AccountService
  ) {}

  async createJournalEntry(organizationId: string, data: CreateJournalEntryInput) {
    if (!data.lines || data.lines.length < 2) {
      throw new BadRequestException('A journal entry must contain at least 2 line items.');
    }

    let totalDebit = toDecimal(0);
    let totalCredit = toDecimal(0);

    for (const line of data.lines) {
      totalDebit = totalDebit.plus(toDecimal(line.debit || 0));
      totalCredit = totalCredit.plus(toDecimal(line.credit || 0));
    }

    if (!totalDebit.minus(totalCredit).abs().lte(0.001)) {
      throw new BadRequestException(
        `Double-entry imbalance detected. Total Debits (₹${totalDebit.toFixed(2)}) must strictly equal Total Credits (₹${totalCredit.toFixed(2)}).`
      );
    }

    if (totalDebit.lte(0)) {
      throw new BadRequestException('Journal entry debit and credit totals must be greater than zero.');
    }

    const entryNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'JOURNAL_VOUCHER',
      'JV'
    );

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          entryDate: new Date(data.entryDate),
          narration: data.narration,
          referenceType: data.referenceType || 'MANUAL',
          referenceId: data.referenceId || undefined,
          status: 'POSTED',
          totalDebit: totalDebit.toNumber(),
          totalCredit: totalCredit.toNumber(),
          lines: {
            create: data.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit || 0,
              credit: l.credit || 0,
              description: l.description || undefined,
            })),
          },
        },
        include: {
          lines: {
            include: { account: true },
          },
        },
      });

      // Update account balances
      for (const line of data.lines) {
        const account = await tx.account.findUnique({
          where: { id: line.accountId },
        });

        if (!account) {
          throw new BadRequestException(`Account with ID ${line.accountId} not found.`);
        }

        const debit = toDecimal(line.debit || 0);
        const credit = toDecimal(line.credit || 0);
        let currentBalance = toDecimal(account.currentBalance.toString());

        if (account.category === 'ASSET' || account.category === 'EXPENSE') {
          currentBalance = currentBalance.plus(debit).minus(credit);
        } else {
          currentBalance = currentBalance.plus(credit).minus(debit);
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: { currentBalance: currentBalance.toNumber() },
        });
      }

      return entry;
    });
  }

  async listJournalEntries(organizationId: string, referenceType?: string) {
    const where: Prisma.JournalEntryWhereInput = { organizationId };
    if (referenceType) {
      where.referenceType = referenceType;
    }

    const entries = await this.prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, category: true },
            },
          },
        },
      },
    });

    return entries.map((entry) => ({
      ...entry,
      totalDebit: entry.totalDebit.toString(),
      totalCredit: entry.totalCredit.toString(),
      lines: entry.lines.map((l) => ({
        ...l,
        debit: l.debit.toString(),
        credit: l.credit.toString(),
      })),
    }));
  }

  async getJournalEntryById(organizationId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, category: true },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found.');
    }

    return {
      ...entry,
      totalDebit: entry.totalDebit.toString(),
      totalCredit: entry.totalCredit.toString(),
      lines: entry.lines.map((l) => ({
        ...l,
        debit: l.debit.toString(),
        credit: l.credit.toString(),
      })),
    };
  }

  // Automatic posting hook for Sales Invoice
  async postSalesInvoiceEntry(organizationId: string, invoice: any, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    await this.accountService.ensureDefaultAccounts(organizationId);

    const arAccount = await this.accountService.getAccountByCode(organizationId, '1200');
    const salesAccount = await this.accountService.getAccountByCode(organizationId, '4100');
    const cgstAccount = await this.accountService.getAccountByCode(organizationId, '2210');
    const sgstAccount = await this.accountService.getAccountByCode(organizationId, '2220');
    const igstAccount = await this.accountService.getAccountByCode(organizationId, '2230');

    const totalAmount = toDecimal(invoice.totalAmount.toString());
    const taxableSubtotal = toDecimal(invoice.subtotalAmount.toString());
    const cgst = toDecimal(invoice.cgstAmount.toString());
    const sgst = toDecimal(invoice.sgstAmount.toString());
    const igst = toDecimal(invoice.igstAmount.toString());

    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [];

    // Debit: Accounts Receivable
    lines.push({
      accountId: arAccount.id,
      debit: totalAmount.toNumber(),
      credit: 0,
      description: `Sales invoice ${invoice.invoiceNumber}`,
    });

    // Credit: Sales Revenue
    lines.push({
      accountId: salesAccount.id,
      debit: 0,
      credit: taxableSubtotal.toNumber(),
      description: `Sales revenue for invoice ${invoice.invoiceNumber}`,
    });

    // Credit: CGST
    if (cgst.gt(0)) {
      lines.push({
        accountId: cgstAccount.id,
        debit: 0,
        credit: cgst.toNumber(),
        description: `Output CGST for invoice ${invoice.invoiceNumber}`,
      });
    }

    // Credit: SGST
    if (sgst.gt(0)) {
      lines.push({
        accountId: sgstAccount.id,
        debit: 0,
        credit: sgst.toNumber(),
        description: `Output SGST for invoice ${invoice.invoiceNumber}`,
      });
    }

    // Credit: IGST
    if (igst.gt(0)) {
      lines.push({
        accountId: igstAccount.id,
        debit: 0,
        credit: igst.toNumber(),
        description: `Output IGST for invoice ${invoice.invoiceNumber}`,
      });
    }

    const entryNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'JOURNAL_VOUCHER',
      'JV'
    );

    const entry = await client.journalEntry.create({
      data: {
        organizationId,
        entryNumber,
        entryDate: new Date(invoice.invoiceDate),
        narration: `Automated journal voucher for sales invoice ${invoice.invoiceNumber}`,
        referenceType: 'SALES_INVOICE',
        referenceId: invoice.id,
        status: 'POSTED',
        totalDebit: totalAmount.toNumber(),
        totalCredit: totalAmount.toNumber(),
        lines: {
          create: lines,
        },
      },
    });

    // Update balances
    for (const l of lines) {
      const acc = await client.account.findUnique({ where: { id: l.accountId } });
      if (!acc) continue;
      const d = toDecimal(l.debit);
      const c = toDecimal(l.credit);
      let bal = toDecimal(acc.currentBalance.toString());
      if (acc.category === 'ASSET' || acc.category === 'EXPENSE') {
        bal = bal.plus(d).minus(c);
      } else {
        bal = bal.plus(c).minus(d);
      }
      await client.account.update({
        where: { id: l.accountId },
        data: { currentBalance: bal.toNumber() },
      });
    }

    return entry;
  }

  // Automatic posting hook for Purchase Bill
  async postPurchaseBillEntry(organizationId: string, bill: any, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    await this.accountService.ensureDefaultAccounts(organizationId);

    const apAccount = await this.accountService.getAccountByCode(organizationId, '2100');
    const purchaseAccount = await this.accountService.getAccountByCode(organizationId, '5200');
    const cgstAccount = await this.accountService.getAccountByCode(organizationId, '1410');
    const sgstAccount = await this.accountService.getAccountByCode(organizationId, '1420');
    const igstAccount = await this.accountService.getAccountByCode(organizationId, '1430');

    const totalAmount = toDecimal(bill.totalAmount.toString());
    const taxableSubtotal = toDecimal(bill.subtotalAmount.toString());
    const cgst = toDecimal(bill.cgstAmount.toString());
    const sgst = toDecimal(bill.sgstAmount.toString());
    const igst = toDecimal(bill.igstAmount.toString());

    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [];

    // Debit: Purchase Expense
    lines.push({
      accountId: purchaseAccount.id,
      debit: taxableSubtotal.toNumber(),
      credit: 0,
      description: `Purchase bill ${bill.billNumber}`,
    });

    // Debit: Input CGST
    if (cgst.gt(0)) {
      lines.push({
        accountId: cgstAccount.id,
        debit: cgst.toNumber(),
        credit: 0,
        description: `Input CGST credit for bill ${bill.billNumber}`,
      });
    }

    // Debit: Input SGST
    if (sgst.gt(0)) {
      lines.push({
        accountId: sgstAccount.id,
        debit: sgst.toNumber(),
        credit: 0,
        description: `Input SGST credit for bill ${bill.billNumber}`,
      });
    }

    // Debit: Input IGST
    if (igst.gt(0)) {
      lines.push({
        accountId: igstAccount.id,
        debit: igst.toNumber(),
        credit: 0,
        description: `Input IGST credit for bill ${bill.billNumber}`,
      });
    }

    // Credit: Accounts Payable
    lines.push({
      accountId: apAccount.id,
      debit: 0,
      credit: totalAmount.toNumber(),
      description: `Accounts payable for bill ${bill.billNumber}`,
    });

    const entryNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'JOURNAL_VOUCHER',
      'JV'
    );

    const entry = await client.journalEntry.create({
      data: {
        organizationId,
        entryNumber,
        entryDate: new Date(bill.billDate),
        narration: `Automated journal voucher for purchase bill ${bill.billNumber}`,
        referenceType: 'PURCHASE_BILL',
        referenceId: bill.id,
        status: 'POSTED',
        totalDebit: totalAmount.toNumber(),
        totalCredit: totalAmount.toNumber(),
        lines: {
          create: lines,
        },
      },
    });

    // Update balances
    for (const l of lines) {
      const acc = await client.account.findUnique({ where: { id: l.accountId } });
      if (!acc) continue;
      const d = toDecimal(l.debit);
      const c = toDecimal(l.credit);
      let bal = toDecimal(acc.currentBalance.toString());
      if (acc.category === 'ASSET' || acc.category === 'EXPENSE') {
        bal = bal.plus(d).minus(c);
      } else {
        bal = bal.plus(c).minus(d);
      }
      await client.account.update({
        where: { id: l.accountId },
        data: { currentBalance: bal.toNumber() },
      });
    }

    return entry;
  }
}
