import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDecimal, roundFinancial } from '@bizflow/shared-utils';

export interface CreateBankAccountDto {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  accountType: 'CURRENT' | 'SAVINGS' | 'OVERDRAFT' | 'CASH_CREDIT';
  upiId?: string;
  openingBalance?: number;
  isDefault?: boolean;
}

export interface RecordTransactionDto {
  bankAccountId: string;
  transactionDate?: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'CONTRA_TRANSFER' | 'CHEQUE_DEPOSIT' | 'CHEQUE_ISSUE';
  amount: number;
  referenceNo?: string;
  chequeNumber?: string;
  notes?: string;
}

export interface CreateLoanAccountDto {
  lenderName: string;
  loanNumber: string;
  principalAmount: number;
  interestRatePct: number;
  tenureMonths: number;
  disbursedDate?: string;
}

@Injectable()
export class BankingService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // OVERVIEW
  // -------------------------------------------------------------
  async getOverview(organizationId: string) {
    const [bankAccounts, loans] = await Promise.all([
      this.prisma.bankAccount.findMany({ where: { organizationId } }),
      this.prisma.loanAccount.findMany({ where: { organizationId, status: 'ACTIVE' } }),
    ]);

    let totalBankBalance = toDecimal(0);
    bankAccounts.forEach((acc) => {
      totalBankBalance = totalBankBalance.plus(toDecimal(acc.currentBalance));
    });

    let totalLoanOutstanding = toDecimal(0);
    let totalMonthlyEmi = toDecimal(0);
    loans.forEach((l) => {
      totalLoanOutstanding = totalLoanOutstanding.plus(toDecimal(l.outstandingBalance));
      totalMonthlyEmi = totalMonthlyEmi.plus(toDecimal(l.emiAmount));
    });

    return {
      accountsCount: bankAccounts.length,
      totalBankBalance: totalBankBalance.toNumber(),
      activeLoansCount: loans.length,
      totalLoanOutstanding: totalLoanOutstanding.toNumber(),
      totalMonthlyEmi: totalMonthlyEmi.toNumber(),
    };
  }

  // -------------------------------------------------------------
  // BANK ACCOUNTS
  // -------------------------------------------------------------
  async listAccounts(organizationId: string) {
    return this.prisma.bankAccount.findMany({
      where: { organizationId },
      orderBy: { isDefault: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
  }

  async createAccount(organizationId: string, dto: CreateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findUnique({
      where: {
        organizationId_accountNumber: {
          organizationId,
          accountNumber: dto.accountNumber.trim(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException('A bank account with this number already exists.');
    }

    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const initialBal = dto.openingBalance || 0;

    return this.prisma.bankAccount.create({
      data: {
        organizationId,
        bankName: dto.bankName.trim(),
        accountNumber: dto.accountNumber.trim(),
        ifscCode: dto.ifscCode.trim().toUpperCase(),
        branchName: dto.branchName,
        accountType: dto.accountType,
        upiId: dto.upiId,
        openingBalance: initialBal,
        currentBalance: initialBal,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  // -------------------------------------------------------------
  // PASSBOOK & TRANSACTIONS
  // -------------------------------------------------------------
  async listTransactions(organizationId: string, bankAccountId?: string) {
    return this.prisma.bankTransaction.findMany({
      where: {
        organizationId,
        ...(bankAccountId ? { bankAccountId } : {}),
      },
      include: {
        account: {
          select: { id: true, bankName: true, accountNumber: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async recordTransaction(organizationId: string, dto: RecordTransactionDto) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found.');
    }

    const currentBal = toDecimal(account.currentBalance);
    const amt = toDecimal(dto.amount);

    let newBal = currentBal;
    if (dto.type === 'DEPOSIT' || dto.type === 'CHEQUE_DEPOSIT') {
      newBal = currentBal.plus(amt);
    } else {
      newBal = currentBal.minus(amt);
    }

    return this.prisma.$transaction(async (tx) => {
      const txRecord = await tx.bankTransaction.create({
        data: {
          organizationId,
          bankAccountId: dto.bankAccountId,
          transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
          type: dto.type,
          amount: amt.toNumber(),
          balanceAfter: newBal.toNumber(),
          referenceNo: dto.referenceNo,
          chequeNumber: dto.chequeNumber,
          isReconciled: false,
          notes: dto.notes,
        },
      });

      await tx.bankAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: newBal.toNumber(),
        },
      });

      return txRecord;
    });
  }

  async reconcileTransaction(organizationId: string, transactionId: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, organizationId },
    });

    if (!tx) {
      throw new NotFoundException('Transaction record not found.');
    }

    return this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------------
  // LOAN ACCOUNTS & EMI SCHEDULES
  // -------------------------------------------------------------
  async listLoans(organizationId: string) {
    return this.prisma.loanAccount.findMany({
      where: { organizationId },
      include: {
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
      },
      orderBy: { disbursedDate: 'desc' },
    });
  }

  async createLoan(organizationId: string, dto: CreateLoanAccountDto) {
    const existing = await this.prisma.loanAccount.findUnique({
      where: {
        organizationId_loanNumber: {
          organizationId,
          loanNumber: dto.loanNumber.trim(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException('A loan with this loan account number already exists.');
    }

    const principal = toDecimal(dto.principalAmount);
    const annualRate = toDecimal(dto.interestRatePct);
    const months = dto.tenureMonths;

    // Monthly interest rate = Annual / 12 / 100
    const monthlyRate = annualRate.dividedBy(12).dividedBy(100);

    // Standard EMI formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
    let emi = toDecimal(0);
    if (monthlyRate.isZero()) {
      emi = roundFinancial(principal.dividedBy(months));
    } else {
      const onePlusR = toDecimal(1).plus(monthlyRate);
      const powN = onePlusR.pow(months);
      const numerator = principal.times(monthlyRate).times(powN);
      const denominator = powN.minus(1);
      emi = roundFinancial(numerator.dividedBy(denominator));
    }

    const disbursed = dto.disbursedDate ? new Date(dto.disbursedDate) : new Date();

    // Generate EMI Schedule
    let remainingPrincipal = principal;
    const scheduleData = [];

    for (let i = 1; i <= months; i++) {
      const interestPart = roundFinancial(remainingPrincipal.times(monthlyRate));
      const principalPart = emi.minus(interestPart);
      remainingPrincipal = remainingPrincipal.minus(principalPart);

      const dueDate = new Date(disbursed);
      dueDate.setMonth(dueDate.getMonth() + i);

      scheduleData.push({
        installmentNo: i,
        dueDate,
        principalPart: principalPart.toNumber(),
        interestPart: interestPart.toNumber(),
        totalEmi: emi.toNumber(),
        isPaid: false,
      });
    }

    return this.prisma.loanAccount.create({
      data: {
        organizationId,
        lenderName: dto.lenderName.trim(),
        loanNumber: dto.loanNumber.trim(),
        principalAmount: principal.toNumber(),
        interestRatePct: annualRate.toNumber(),
        tenureMonths: months,
        emiAmount: emi.toNumber(),
        disbursedDate: disbursed,
        outstandingBalance: principal.toNumber(),
        status: 'ACTIVE',
        emiSchedules: {
          create: scheduleData,
        },
      },
      include: {
        emiSchedules: true,
      },
    });
  }

  async payEmi(organizationId: string, scheduleId: string) {
    const emi = await this.prisma.loanEmiSchedule.findUnique({
      where: { id: scheduleId },
      include: { loan: true },
    });

    if (!emi || emi.loan.organizationId !== organizationId) {
      throw new NotFoundException('EMI schedule item not found.');
    }

    if (emi.isPaid) {
      throw new BadRequestException('This EMI installment has already been marked as paid.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedEmi = await tx.loanEmiSchedule.update({
        where: { id: scheduleId },
        data: {
          isPaid: true,
          paidDate: new Date(),
        },
      });

      const updatedLoan = await tx.loanAccount.update({
        where: { id: emi.loanAccountId },
        data: {
          outstandingBalance: {
            decrement: emi.principalPart,
          },
        },
      });

      return { updatedEmi, updatedLoan };
    });
  }
}
