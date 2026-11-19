import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBanking() {
  console.log('--- Seeding Module E: Cash, Bank & Loans ---');
  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    console.log(`Seeding Banking & Loans for ${org.name}...`);

    // 1. Bank Accounts
    const existingHdfc = await prisma.bankAccount.findFirst({
      where: { organizationId: org.id, accountNumber: '50200088991122' },
    });
    let hdfcAcc = existingHdfc;
    if (!existingHdfc) {
      hdfcAcc = await prisma.bankAccount.create({
        data: {
          organizationId: org.id,
          bankName: 'HDFC Bank Ltd',
          accountNumber: '50200088991122',
          ifscCode: 'HDFC0000060',
          branchName: 'Fort Commercial Branch, Mumbai',
          accountType: 'CURRENT',
          upiId: 'bizflow.ops@hdfcbank',
          openingBalance: 250000,
          currentBalance: 418500,
          isDefault: true,
        },
      });
    }

    const existingSbi = await prisma.bankAccount.findFirst({
      where: { organizationId: org.id, accountNumber: '309988221100' },
    });
    if (!existingSbi) {
      await prisma.bankAccount.create({
        data: {
          organizationId: org.id,
          bankName: 'State Bank of India',
          accountNumber: '309988221100',
          ifscCode: 'SBIN0001234',
          branchName: 'Nariman Point Corporate Branch',
          accountType: 'CASH_CREDIT',
          upiId: 'bizflow.cc@sbi',
          openingBalance: 100000,
          currentBalance: 145000,
          isDefault: false,
        },
      });
    }

    // 2. Bank Transactions / Passbook
    if (hdfcAcc) {
      const existingTx = await prisma.bankTransaction.findFirst({
        where: { organizationId: org.id, bankAccountId: hdfcAcc.id },
      });
      if (!existingTx) {
        await prisma.bankTransaction.createMany({
          data: [
            {
              organizationId: org.id,
              bankAccountId: hdfcAcc.id,
              transactionDate: new Date('2026-11-02'),
              type: 'DEPOSIT',
              amount: 150000,
              balanceAfter: 400000,
              referenceNo: 'NEFT-INW-9812491',
              isReconciled: true,
              reconciledAt: new Date('2026-11-03'),
              notes: 'Client invoice settlement transfer',
            },
            {
              organizationId: org.id,
              bankAccountId: hdfcAcc.id,
              transactionDate: new Date('2026-11-05'),
              type: 'WITHDRAWAL',
              amount: 35000,
              balanceAfter: 365000,
              referenceNo: 'ATM-WDL-1092',
              isReconciled: true,
              reconciledAt: new Date('2026-11-05'),
              notes: 'Office petty cash replenishment',
            },
            {
              organizationId: org.id,
              bankAccountId: hdfcAcc.id,
              transactionDate: new Date('2026-11-12'),
              type: 'CHEQUE_DEPOSIT',
              amount: 75000,
              balanceAfter: 440000,
              chequeNumber: 'CHQ-891024',
              referenceNo: 'CTS-CLEAR-4421',
              isReconciled: true,
              reconciledAt: new Date('2026-11-13'),
              notes: 'Tata Motors vendor payment cheque cleared',
            },
            {
              organizationId: org.id,
              bankAccountId: hdfcAcc.id,
              transactionDate: new Date('2026-11-15'),
              type: 'CHEQUE_ISSUE',
              amount: 21500,
              balanceAfter: 418500,
              chequeNumber: 'CHQ-000451',
              referenceNo: 'CLG-OUT-8872',
              isReconciled: false,
              notes: 'Office property maintenance cheque issued',
            },
          ],
        });
      }
    }

    // 3. Loan Accounts & EMI Amortization Schedule
    const existingLoan = await prisma.loanAccount.findFirst({
      where: { organizationId: org.id, loanNumber: 'HDFC-MSME-2026-08' },
    });
    if (!existingLoan) {
      const principal = 1200000;
      const rate = 10.5;
      const tenure = 24;
      const monthlyRate = (rate / 12) / 100;
      const onePlusR = 1 + monthlyRate;
      const powN = Math.pow(onePlusR, tenure);
      const emi = Math.round((principal * monthlyRate * powN) / (powN - 1));

      const disbursed = new Date('2026-09-01');
      let remainingPrincipal = principal;
      const emiSchedules = [];

      for (let i = 1; i <= tenure; i++) {
        const interestPart = Math.round(remainingPrincipal * monthlyRate);
        const principalPart = emi - interestPart;
        remainingPrincipal -= principalPart;

        const dueDate = new Date(disbursed);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Mark installments 1 and 2 as paid
        const isPaid = i <= 2;
        const paidDate = isPaid ? new Date(dueDate) : null;

        emiSchedules.push({
          installmentNo: i,
          dueDate,
          principalPart,
          interestPart,
          totalEmi: emi,
          isPaid,
          paidDate,
        });
      }

      const totalPaidPrincipal = emiSchedules
        .filter((s) => s.isPaid)
        .reduce((sum, s) => sum + s.principalPart, 0);

      await prisma.loanAccount.create({
        data: {
          organizationId: org.id,
          lenderName: 'HDFC Bank MSME Lending Division',
          loanNumber: 'HDFC-MSME-2026-08',
          principalAmount: principal,
          interestRatePct: rate,
          tenureMonths: tenure,
          emiAmount: emi,
          disbursedDate: disbursed,
          outstandingBalance: principal - totalPaidPrincipal,
          status: 'ACTIVE',
          emiSchedules: {
            create: emiSchedules,
          },
        },
      });
    }

    console.log(`✓ Module E seeded for ${org.name}`);
  }

  console.log('--- Module E Seeding Completed Successfully ---');
}

seedBanking()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
