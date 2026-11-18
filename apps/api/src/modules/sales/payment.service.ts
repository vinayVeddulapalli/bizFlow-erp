import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { RecordPaymentReceiptInput } from '@bizflow/validation';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService
  ) {}

  async listPayments(organizationId: string, customerId?: string) {
    return this.prisma.paymentReceipt.findMany({
      where: {
        organizationId,
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async recordPayment(organizationId: string, input: RecordPaymentReceiptInput) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const receiptNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'PAYMENT_RECEIPT'
    );

    const paymentAmount = toDecimal(input.amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Payment Receipt
      const payment = await tx.paymentReceipt.create({
        data: {
          organizationId,
          customerId: input.customerId,
          receiptNumber,
          paymentDate: new Date(input.paymentDate),
          paymentMode: input.paymentMode,
          amount: paymentAmount.toString(),
          referenceNo: input.referenceNo || null,
          notes: input.notes || null,
        },
      });

      // 2. Reduce Customer Outstanding Balance
      await tx.customer.update({
        where: { id: input.customerId },
        data: {
          currentBalance: {
            decrement: paymentAmount.toNumber(),
          },
        },
      });

      // 3. Process invoice allocations if provided
      if (input.allocations && input.allocations.length > 0) {
        for (const alloc of input.allocations) {
          const invoice = await tx.salesInvoice.findFirst({
            where: { id: alloc.invoiceId, organizationId },
          });

          if (!invoice) continue;

          const allocAmount = toDecimal(alloc.allocatedAmount);
          const currentPaid = toDecimal(invoice.paidAmount.toString());
          const newPaid = currentPaid.plus(allocAmount);
          const totalAmount = toDecimal(invoice.totalAmount.toString());
          const newDue = totalAmount.minus(newPaid);

          const newStatus = newDue.lte(0) ? 'PAID' : 'PARTIALLY_PAID';

          await tx.paymentReceiptAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: invoice.id,
              allocatedAmount: allocAmount.toString(),
            },
          });

          await tx.salesInvoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: newPaid.toString(),
              dueAmount: newDue.gt(0) ? newDue.toString() : '0.00',
              status: newStatus,
            },
          });
        }
      }

      return payment;
    });
  }
}
