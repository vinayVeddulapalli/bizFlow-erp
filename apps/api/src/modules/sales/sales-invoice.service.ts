import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { JournalService } from '../accounting/journal.service';
import { CreateSalesInvoiceInput } from '@bizflow/validation';
import {
  calculateItemGst,
  calculateRoundOff,
  Decimal,
  toDecimal,
  roundFinancial,
} from '@bizflow/shared-utils';

@Injectable()
export class SalesInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService,
    private readonly journalService: JournalService
  ) {}

  async listInvoices(organizationId: string, status?: string, customerId?: string) {
    return this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as any } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: {
          select: { id: true, name: true, companyName: true, gstin: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async getInvoice(organizationId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Sales invoice not found');
    }

    return invoice;
  }

  async createInvoice(organizationId: string, input: CreateSalesInvoiceInput) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const supplierStateCode = branch.stateCode;
    const placeOfSupply = input.placeOfSupply || customer.stateCode;

    let subtotalAmount = toDecimal(0);
    let totalDiscountAmount = toDecimal(0);
    let totalCgstAmount = toDecimal(0);
    let totalSgstAmount = toDecimal(0);
    let totalIgstAmount = toDecimal(0);
    let totalTaxAmount = toDecimal(0);

    const calculatedItems = input.items.map((item) => {
      const calculation = calculateItemGst({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate,
        isTaxInclusive: false,
        supplierStateCode,
        placeOfSupplyStateCode: placeOfSupply,
      });

      const lineDiscount = item.discountAmount
        ? toDecimal(item.discountAmount)
        : toDecimal(item.quantity)
            .times(toDecimal(item.unitPrice))
            .times(toDecimal(item.discountPct || 0))
            .dividedBy(100);

      subtotalAmount = subtotalAmount.plus(calculation.taxableAmount);
      totalDiscountAmount = totalDiscountAmount.plus(lineDiscount);
      totalCgstAmount = totalCgstAmount.plus(calculation.cgstAmount);
      totalSgstAmount = totalSgstAmount.plus(calculation.sgstAmount);
      totalIgstAmount = totalIgstAmount.plus(calculation.igstAmount);
      totalTaxAmount = totalTaxAmount.plus(calculation.totalTaxAmount);

      return {
        productId: item.productId || null,
        description: item.description,
        hsnSacCode: item.hsnSacCode || null,
        quantity: toDecimal(item.quantity).toString(),
        unitPrice: toDecimal(item.unitPrice).toString(),
        discountPct: toDecimal(item.discountPct || 0).toString(),
        discountAmount: lineDiscount.toString(),
        taxableAmount: calculation.taxableAmount.toString(),
        taxRate: toDecimal(item.taxRate).toString(),
        cgstAmount: calculation.cgstAmount.toString(),
        sgstAmount: calculation.sgstAmount.toString(),
        igstAmount: calculation.igstAmount.toString(),
        totalAmount: calculation.totalAmount.toString(),
      };
    });

    const exactTotal = subtotalAmount.plus(totalTaxAmount);
    const { roundedTotal, roundOffAmount } = calculateRoundOff(exactTotal);

    const tempInvoiceNumber = `DRAFT-${Date.now().toString().slice(-6)}`;

    return this.prisma.salesInvoice.create({
      data: {
        organizationId,
        branchId: input.branchId,
        customerId: input.customerId,
        invoiceNumber: tempInvoiceNumber,
        invoiceDate: new Date(input.invoiceDate),
        dueDate: new Date(input.dueDate),
        status: 'DRAFT',
        subtotalAmount: roundFinancial(subtotalAmount, 2).toString(),
        discountAmount: roundFinancial(totalDiscountAmount, 2).toString(),
        cgstAmount: roundFinancial(totalCgstAmount, 2).toString(),
        sgstAmount: roundFinancial(totalSgstAmount, 2).toString(),
        igstAmount: roundFinancial(totalIgstAmount, 2).toString(),
        totalTaxAmount: roundFinancial(totalTaxAmount, 2).toString(),
        roundOffAmount: roundOffAmount.toString(),
        totalAmount: roundedTotal.toString(),
        paidAmount: '0.00',
        dueAmount: roundedTotal.toString(),
        placeOfSupply,
        notes: input.notes || null,
        terms: input.terms || null,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });
  }

  async postInvoice(organizationId: string, id: string) {
    const invoice = await this.getInvoice(organizationId, id);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot post invoice with status "${invoice.status}"`);
    }

    const officialNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'SALES_INVOICE'
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.salesInvoice.update({
        where: { id },
        data: {
          invoiceNumber: officialNumber,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      // Increment customer's outstanding balance
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          currentBalance: {
            increment: new Decimal(invoice.totalAmount.toString()).toNumber(),
          },
        },
      });

      // Deduct warehouse stock for goods
      const defaultWh = await tx.warehouse.findFirst({
        where: { organizationId, branchId: invoice.branchId },
      });

      if (defaultWh) {
        for (const item of invoice.items) {
          if (item.productId) {
            const qty = toDecimal(item.quantity.toString());
            await tx.stockLevel.upsert({
              where: {
                organizationId_productId_warehouseId: {
                  organizationId,
                  productId: item.productId,
                  warehouseId: defaultWh.id,
                },
              },
              update: {
                quantity: { decrement: qty.toNumber() },
              },
              create: {
                organizationId,
                productId: item.productId,
                warehouseId: defaultWh.id,
                quantity: new Decimal(0).minus(qty).toString(),
              },
            });

            await tx.stockMovement.create({
              data: {
                organizationId,
                productId: item.productId,
                warehouseId: defaultWh.id,
                movementType: 'SALES_INVOICE',
                quantity: new Decimal(0).minus(qty).toString(),
                unitCost: toDecimal(item.unitPrice.toString()).toString(),
                referenceType: 'sales_invoice',
                referenceId: invoice.id,
                notes: `Sold via Invoice ${officialNumber}`,
              },
            });
          }
        }
      }

      // Post double-entry journal entry
      await this.journalService.postSalesInvoiceEntry(
        organizationId,
        { ...invoice, invoiceNumber: officialNumber },
        tx
      );

      // Log to audit log
      await tx.auditLog.create({
        data: {
          organizationId,
          action: 'POST_SALES_INVOICE',
          entityType: 'sales_invoice',
          entityId: id,
          changes: {
            invoiceNumber: officialNumber,
            totalAmount: invoice.totalAmount.toString(),
          },
        },
      });

      return updatedInvoice;
    });
  }

  async cancelInvoice(organizationId: string, id: string) {
    const invoice = await this.getInvoice(organizationId, id);
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Invoice is already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.salesInvoice.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (invoice.status === 'POSTED' || invoice.status === 'PARTIALLY_PAID') {
        // Reverse remaining due balance from customer
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            currentBalance: {
              decrement: new Decimal(invoice.dueAmount.toString()).toNumber(),
            },
          },
        });
      }

      return cancelled;
    });
  }

  async getInvoiceHtml(organizationId: string, id: string): Promise<string> {
    const invoice = await this.getInvoice(organizationId, id);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const isIntraState = invoice.cgstAmount && toDecimal(invoice.cgstAmount.toString()).gt(0);

    const rows = invoice.items
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">
          <strong>${item.description}</strong>
          ${item.hsnSacCode ? `<br/><span style="font-size: 11px; color: #64748b;">HSN: ${item.hsnSacCode}</span>` : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${item.unitPrice}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${item.taxableAmount}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${item.taxRate}%</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹${item.totalAmount}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Tax Invoice - ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
          .company-title { font-size: 22px; font-weight: bold; color: #0f172a; }
          .invoice-badge { display: inline-block; background: #0d9488; color: white; padding: 4px 10px; font-weight: bold; font-size: 12px; border-radius: 4px; }
          .details-grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .section-title { font-weight: bold; color: #475569; text-transform: uppercase; font-size: 11px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f8fafc; padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
          .totals-table { width: 320px; margin-left: auto; }
          .totals-table td { padding: 6px 10px; }
          .grand-total { font-size: 16px; font-weight: bold; background: #f0fdfa; color: #0f766e; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">${org?.name || 'BizFlow Enterprise'}</div>
            <div>${invoice.branch.addressLine1}, ${invoice.branch.city}, ${invoice.branch.state} - ${invoice.branch.postalCode}</div>
            ${invoice.branch.gstin ? `<div><strong>GSTIN:</strong> ${invoice.branch.gstin}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div class="invoice-badge">TAX INVOICE</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 6px;">${invoice.invoiceNumber}</div>
            <div><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</div>
            <div><strong>Due:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="details-grid">
          <div>
            <div class="section-title">Billed To (Customer)</div>
            <div style="font-size: 15px; font-weight: bold;">${invoice.customer.name}</div>
            ${invoice.customer.companyName ? `<div>${invoice.customer.companyName}</div>` : ''}
            <div>${invoice.customer.billingAddress}</div>
            <div>${invoice.customer.state} (State Code: ${invoice.customer.stateCode})</div>
            ${invoice.customer.gstin ? `<div><strong>GSTIN:</strong> ${invoice.customer.gstin}</div>` : '<div>Unregistered Party</div>'}
          </div>

          <div style="text-align: right;">
            <div class="section-title">Invoice Details</div>
            <div><strong>Place of Supply:</strong> ${invoice.placeOfSupply}</div>
            <div><strong>Supply Type:</strong> ${isIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</div>
            <div><strong>Status:</strong> ${invoice.status}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Description</th>
              <th style="width: 60px; text-align: right;">Qty</th>
              <th style="width: 80px; text-align: right;">Price</th>
              <th style="width: 90px; text-align: right;">Taxable</th>
              <th style="width: 60px; text-align: right;">Tax %</th>
              <th style="width: 100px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal (Taxable):</td>
            <td style="text-align: right; font-weight: bold;">₹${invoice.subtotalAmount}</td>
          </tr>
          ${
            isIntraState
              ? `
            <tr>
              <td>CGST Amount:</td>
              <td style="text-align: right;">₹${invoice.cgstAmount}</td>
            </tr>
            <tr>
              <td>SGST Amount:</td>
              <td style="text-align: right;">₹${invoice.sgstAmount}</td>
            </tr>
          `
              : `
            <tr>
              <td>IGST Amount:</td>
              <td style="text-align: right;">₹${invoice.igstAmount}</td>
            </tr>
          `
          }
          <tr>
            <td>Total Tax:</td>
            <td style="text-align: right;">₹${invoice.totalTaxAmount}</td>
          </tr>
          <tr>
            <td>Round Off:</td>
            <td style="text-align: right;">₹${invoice.roundOffAmount}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total:</td>
            <td style="text-align: right;">₹${invoice.totalAmount}</td>
          </tr>
          <tr>
            <td>Paid Amount:</td>
            <td style="text-align: right; color: #10b981;">₹${invoice.paidAmount}</td>
          </tr>
          <tr>
            <td>Balance Due:</td>
            <td style="text-align: right; font-weight: bold; color: #dc2626;">₹${invoice.dueAmount}</td>
          </tr>
        </table>

        ${invoice.terms ? `<div style="margin-top: 30px; font-size: 11px; color: #64748b;"><strong>Terms:</strong> ${invoice.terms}</div>` : ''}
      </body>
      </html>
    `;
  }

  async syncInvoice(
    organizationId: string,
    operationId: string,
    input: CreateSalesInvoiceInput,
    autoPost: boolean = true
  ) {
    const idempotencyKey = `${organizationId}:sync_invoice:${operationId}`;
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      return existing.responseBody;
    }

    const draft = await this.createInvoice(organizationId, input);
    let result: any = draft;
    if (autoPost) {
      result = await this.postInvoice(organizationId, draft.id);
    }

    await this.prisma.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        organizationId,
        endpoint: '/sales/invoices/sync',
        responseStatus: 200,
        responseBody: result as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return result;
  }
}
