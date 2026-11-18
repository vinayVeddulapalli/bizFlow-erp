import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { CreatePurchaseInvoiceInput } from '@bizflow/validation';
import {
  calculateItemGst,
  toDecimal,
  roundFinancial,
  Decimal,
} from '@bizflow/shared-utils';

@Injectable()
export class PurchaseBillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService
  ) {}

  async listBills(organizationId: string, supplierId?: string, status?: string) {
    return this.prisma.purchaseInvoice.findMany({
      where: {
        organizationId,
        ...(supplierId ? { supplierId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, companyName: true, gstin: true } },
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true } },
      },
      orderBy: { billDate: 'desc' },
    });
  }

  async getBill(organizationId: string, id: string) {
    const bill = await this.prisma.purchaseInvoice.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        branch: true,
        items: true,
      },
    });

    if (!bill) {
      throw new NotFoundException('Purchase bill not found');
    }

    return bill;
  }

  async createBill(organizationId: string, input: CreatePurchaseInvoiceInput) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: input.supplierId, organizationId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    let subtotalAmount = toDecimal(0);
    let totalCgstAmount = toDecimal(0);
    let totalSgstAmount = toDecimal(0);
    let totalIgstAmount = toDecimal(0);
    let totalTaxAmount = toDecimal(0);

    const calculatedItems = input.items.map((item) => {
      const calculation = calculateItemGst({
        quantity: item.quantity,
        unitPrice: item.unitCost,
        taxRate: item.taxRate,
        isTaxInclusive: false,
        supplierStateCode: supplier.stateCode,
        placeOfSupplyStateCode: branch.stateCode,
      });

      subtotalAmount = subtotalAmount.plus(calculation.taxableAmount);
      totalCgstAmount = totalCgstAmount.plus(calculation.cgstAmount);
      totalSgstAmount = totalSgstAmount.plus(calculation.sgstAmount);
      totalIgstAmount = totalIgstAmount.plus(calculation.igstAmount);
      totalTaxAmount = totalTaxAmount.plus(calculation.totalTaxAmount);

      return {
        productId: item.productId || null,
        description: item.description,
        hsnSacCode: item.hsnSacCode || null,
        quantity: toDecimal(item.quantity).toString(),
        unitCost: toDecimal(item.unitCost).toString(),
        taxRate: toDecimal(item.taxRate).toString(),
        taxableAmount: calculation.taxableAmount.toString(),
        cgstAmount: calculation.cgstAmount.toString(),
        sgstAmount: calculation.sgstAmount.toString(),
        igstAmount: calculation.igstAmount.toString(),
        totalAmount: calculation.totalAmount.toString(),
      };
    });

    const totalAmount = subtotalAmount.plus(totalTaxAmount);
    const tempBillNumber = `DRAFT-BILL-${Date.now().toString().slice(-6)}`;

    return this.prisma.purchaseInvoice.create({
      data: {
        organizationId,
        branchId: input.branchId,
        supplierId: input.supplierId,
        billNumber: tempBillNumber,
        supplierBillNo: input.supplierBillNo,
        billDate: new Date(input.billDate),
        dueDate: new Date(input.dueDate),
        status: 'DRAFT',
        subtotalAmount: roundFinancial(subtotalAmount, 2).toString(),
        discountAmount: '0.00',
        cgstAmount: roundFinancial(totalCgstAmount, 2).toString(),
        sgstAmount: roundFinancial(totalSgstAmount, 2).toString(),
        igstAmount: roundFinancial(totalIgstAmount, 2).toString(),
        totalTaxAmount: roundFinancial(totalTaxAmount, 2).toString(),
        totalAmount: roundFinancial(totalAmount, 2).toString(),
        paidAmount: '0.00',
        dueAmount: roundFinancial(totalAmount, 2).toString(),
        notes: input.notes || null,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        items: true,
        supplier: true,
      },
    });
  }

  async postBill(organizationId: string, id: string) {
    const bill = await this.getBill(organizationId, id);
    if (bill.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot post bill with status "${bill.status}"`);
    }

    const officialNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'PURCHASE_BILL'
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedBill = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          billNumber: officialNumber,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      // Increment supplier payable balance
      await tx.supplier.update({
        where: { id: bill.supplierId },
        data: {
          currentBalance: {
            increment: new Decimal(bill.totalAmount.toString()).toNumber(),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          action: 'POST_PURCHASE_BILL',
          entityType: 'purchase_invoice',
          entityId: id,
          changes: {
            billNumber: officialNumber,
            totalAmount: bill.totalAmount.toString(),
          },
        },
      });

      return updatedBill;
    });
  }
}
