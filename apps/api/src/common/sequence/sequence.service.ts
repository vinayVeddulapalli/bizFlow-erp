import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextNumber(
    organizationId: string,
    documentType: 'SALES_INVOICE' | 'PURCHASE_BILL' | 'PAYMENT_RECEIPT',
    customPrefix?: string
  ): Promise<string> {
    const now = new Date();
    // Indian Fiscal Year: April 1 to March 31
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const startYear = month >= 4 ? year : year - 1;
    const fiscalYear = `${startYear}-${(startYear + 1).toString().slice(-2)}`;

    let prefix = customPrefix;
    if (!prefix) {
      if (documentType === 'SALES_INVOICE') prefix = 'INV';
      else if (documentType === 'PURCHASE_BILL') prefix = 'BILL';
      else if (documentType === 'PAYMENT_RECEIPT') prefix = 'REC';
      else prefix = 'DOC';
    }

    // Atomic increment or initialize
    const seq = await this.prisma.documentSequence.upsert({
      where: {
        organizationId_documentType_fiscalYear: {
          organizationId,
          documentType,
          fiscalYear,
        },
      },
      update: {
        lastNumber: { increment: 1 },
      },
      create: {
        organizationId,
        documentType,
        fiscalYear,
        prefix,
        lastNumber: 1,
      },
    });

    const paddedNumber = seq.lastNumber.toString().padStart(5, '0');
    return `${prefix}-${fiscalYear}-${paddedNumber}`;
  }
}
