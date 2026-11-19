import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { toDecimal, roundFinancial } from '@bizflow/shared-utils';

export interface CreateSalesOrderDto {
  branchId?: string;
  customerId: string;
  orderDate?: string;
  validUntil?: string;
  notes?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

export interface CreatePurchaseOrderDto {
  branchId?: string;
  supplierId: string;
  orderDate?: string;
  expectedDate?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export interface CreateDeliveryChallanDto {
  branchId?: string;
  customerId: string;
  challanDate?: string;
  vehicleNumber?: string;
  ewayBillNumber?: string;
  lines: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface CreateCreditNoteDto {
  branchId?: string;
  customerId: string;
  noteDate?: string;
  originalInvoiceId?: string;
  reasonCode: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export interface CreateDebitNoteDto {
  branchId?: string;
  supplierId: string;
  noteDate?: string;
  originalBillId?: string;
  reasonCode: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
    taxRate?: number;
  }>;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService
  ) {}

  // -------------------------------------------------------------
  // MODULE C OVERVIEW
  // -------------------------------------------------------------
  async getOverview(organizationId: string) {
    const [
      soPending,
      soTotal,
      poPlaced,
      poTotal,
      challansCount,
      cnCount,
      dnCount,
    ] = await Promise.all([
      this.prisma.salesOrder.count({
        where: { organizationId, status: 'PENDING' },
      }),
      this.prisma.salesOrder.aggregate({
        where: { organizationId },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId, status: 'PLACED' },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { organizationId },
        _sum: { totalAmount: true },
      }),
      this.prisma.deliveryChallan.count({ where: { organizationId } }),
      this.prisma.creditNote.count({ where: { organizationId } }),
      this.prisma.debitNote.count({ where: { organizationId } }),
    ]);

    return {
      salesOrders: {
        pendingCount: soPending,
        totalBookedAmount: soTotal._sum.totalAmount || 0,
      },
      purchaseOrders: {
        placedCount: poPlaced,
        totalOrderedAmount: poTotal._sum.totalAmount || 0,
      },
      deliveryChallansCount: challansCount,
      creditNotesCount: cnCount,
      debitNotesCount: dnCount,
    };
  }

  // -------------------------------------------------------------
  // SALES ORDERS
  // -------------------------------------------------------------
  async listSalesOrders(organizationId: string, status?: string) {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Hydrate customer and product names
    const customerIds = [...new Set(orders.map((o) => o.customerId))];
    const productIds = [
      ...new Set(orders.flatMap((o) => o.lines.map((l) => l.productId))),
    ];

    const [customers, products] = await Promise.all([
      this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, companyName: true, phone: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      }),
    ]);

    const custMap = new Map(customers.map((c) => [c.id, c]));
    const prodMap = new Map(products.map((p) => [p.id, p]));

    return orders.map((o) => ({
      ...o,
      customer: custMap.get(o.customerId) || null,
      lines: o.lines.map((l) => ({
        ...l,
        product: prodMap.get(l.productId) || null,
      })),
    }));
  }

  async createSalesOrder(organizationId: string, dto: CreateSalesOrderDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Sales order must contain at least one line item.');
    }

    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId },
      });
      if (!defaultBranch) {
        throw new NotFoundException('No active branch found.');
      }
      branchId = defaultBranch.id;
    }

    const orderNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'SALES_ORDER',
      'SO'
    );

    let totalTaxable = toDecimal(0);
    let totalTax = toDecimal(0);
    let totalAmount = toDecimal(0);

    const calculatedLines = dto.lines.map((l) => {
      const qty = toDecimal(l.quantity);
      const price = toDecimal(l.unitPrice);
      const taxRate = toDecimal(l.taxRate || 0);

      const lineTaxable = roundFinancial(qty.times(price));
      const lineTax = roundFinancial(lineTaxable.times(taxRate).dividedBy(100));
      const lineTotal = lineTaxable.plus(lineTax);

      totalTaxable = totalTaxable.plus(lineTaxable);
      totalTax = totalTax.plus(lineTax);
      totalAmount = totalAmount.plus(lineTotal);

      return {
        productId: l.productId,
        quantity: qty.toNumber(),
        fulfilledQty: 0,
        unitPrice: price.toNumber(),
        taxRate: taxRate.toNumber(),
        taxAmount: lineTax.toNumber(),
        lineTotal: lineTotal.toNumber(),
      };
    });

    return this.prisma.salesOrder.create({
      data: {
        organizationId,
        branchId,
        customerId: dto.customerId,
        orderNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        status: 'PENDING',
        totalTaxable: totalTaxable.toNumber(),
        totalTax: totalTax.toNumber(),
        totalAmount: totalAmount.toNumber(),
        notes: dto.notes,
        lines: {
          create: calculatedLines,
        },
      },
      include: {
        lines: true,
      },
    });
  }

  async convertSalesOrderToInvoice(organizationId: string, orderId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { lines: true },
    });

    if (!order) {
      throw new NotFoundException('Sales Order not found.');
    }

    if (order.status === 'COMPLETED' || order.convertedInvoiceId) {
      throw new BadRequestException('Sales order has already been converted to an invoice.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: order.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer associated with order not found.');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: order.branchId },
    });
    if (!branch) {
      throw new NotFoundException('Branch associated with order not found.');
    }

    const isInterState = branch.stateCode !== customer.stateCode;
    const invoiceNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'SALES_INVOICE',
      'INV'
    );

    // Create Invoice atomically and mark order COMPLETED
    const invoice = await this.prisma.$transaction(async (tx) => {
      let invSubtotal = toDecimal(0);
      let invCgst = toDecimal(0);
      let invSgst = toDecimal(0);
      let invIgst = toDecimal(0);
      let invTotalTax = toDecimal(0);

      const itemsData = order.lines.map((l) => {
        const taxable = toDecimal(l.unitPrice).times(toDecimal(l.quantity));
        const taxRate = toDecimal(l.taxRate);
        const taxAmount = roundFinancial(taxable.times(taxRate).dividedBy(100));
        invSubtotal = invSubtotal.plus(taxable);
        invTotalTax = invTotalTax.plus(taxAmount);

        let cgst = toDecimal(0);
        let sgst = toDecimal(0);
        let igst = toDecimal(0);

        if (isInterState) {
          igst = taxAmount;
          invIgst = invIgst.plus(igst);
        } else {
          cgst = roundFinancial(taxAmount.dividedBy(2));
          sgst = taxAmount.minus(cgst);
          invCgst = invCgst.plus(cgst);
          invSgst = invSgst.plus(sgst);
        }

        return {
          productId: l.productId,
          description: `Item from SO #${order.orderNumber}`,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: 0,
          taxableAmount: taxable.toNumber(),
          taxRate: taxRate.toNumber(),
          cgstAmount: cgst.toNumber(),
          sgstAmount: sgst.toNumber(),
          igstAmount: igst.toNumber(),
          totalAmount: taxable.plus(taxAmount).toNumber(),
        };
      });

      const grandTotal = invSubtotal.plus(invTotalTax);

      const inv = await tx.salesInvoice.create({
        data: {
          organizationId,
          branchId: order.branchId,
          customerId: order.customerId,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 86400000),
          status: 'POSTED',
          placeOfSupply: customer.stateCode,
          subtotalAmount: invSubtotal.toNumber(),
          discountAmount: 0,
          cgstAmount: invCgst.toNumber(),
          sgstAmount: invSgst.toNumber(),
          igstAmount: invIgst.toNumber(),
          totalTaxAmount: invTotalTax.toNumber(),
          roundOffAmount: 0,
          totalAmount: grandTotal.toNumber(),
          paidAmount: 0,
          dueAmount: grandTotal.toNumber(),
          notes: `Converted from Sales Order ${order.orderNumber}`,
          items: {
            create: itemsData,
          },
        },
      });

      // Update SalesOrder status
      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          convertedInvoiceId: inv.id,
        },
      });

      // Update customer current balance
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentBalance: {
            increment: grandTotal.toNumber(),
          },
        },
      });

      return inv;
    });

    return invoice;
  }

  // -------------------------------------------------------------
  // PURCHASE ORDERS
  // -------------------------------------------------------------
  async listPurchaseOrders(organizationId: string, status?: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const supplierIds = [...new Set(orders.map((o) => o.supplierId))];
    const productIds = [
      ...new Set(orders.flatMap((o) => o.lines.map((l) => l.productId))),
    ];

    const [suppliers, products] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, name: true, companyName: true, phone: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      }),
    ]);

    const suppMap = new Map(suppliers.map((s) => [s.id, s]));
    const prodMap = new Map(products.map((p) => [p.id, p]));

    return orders.map((o) => ({
      ...o,
      supplier: suppMap.get(o.supplierId) || null,
      lines: o.lines.map((l) => ({
        ...l,
        product: prodMap.get(l.productId) || null,
      })),
    }));
  }

  async createPurchaseOrder(organizationId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Purchase order must contain at least one line item.');
    }

    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId },
      });
      if (!defaultBranch) {
        throw new NotFoundException('No active branch found.');
      }
      branchId = defaultBranch.id;
    }

    const orderNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'PURCHASE_ORDER',
      'PO'
    );

    let totalAmount = toDecimal(0);
    const linesData = dto.lines.map((l) => {
      const qty = toDecimal(l.quantity);
      const cost = toDecimal(l.unitCost);
      const total = roundFinancial(qty.times(cost));
      totalAmount = totalAmount.plus(total);

      return {
        productId: l.productId,
        quantity: qty.toNumber(),
        unitCost: cost.toNumber(),
        lineTotal: total.toNumber(),
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        branchId,
        supplierId: dto.supplierId,
        orderNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        status: 'PLACED',
        totalAmount: totalAmount.toNumber(),
        lines: {
          create: linesData,
        },
      },
      include: {
        lines: true,
      },
    });
  }

  // -------------------------------------------------------------
  // DELIVERY CHALLANS
  // -------------------------------------------------------------
  async listDeliveryChallans(organizationId: string) {
    const challans = await this.prisma.deliveryChallan.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    const customerIds = [...new Set(challans.map((c) => c.customerId))];
    const productIds = [
      ...new Set(challans.flatMap((c) => c.lines.map((l) => l.productId))),
    ];

    const [customers, products] = await Promise.all([
      this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, companyName: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      }),
    ]);

    const custMap = new Map(customers.map((c) => [c.id, c]));
    const prodMap = new Map(products.map((p) => [p.id, p]));

    return challans.map((c) => ({
      ...c,
      customer: custMap.get(c.customerId) || null,
      lines: c.lines.map((l) => ({
        ...l,
        product: prodMap.get(l.productId) || null,
      })),
    }));
  }

  async createDeliveryChallan(
    organizationId: string,
    dto: CreateDeliveryChallanDto
  ) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Challan must have at least one product.');
    }

    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId },
      });
      if (!defaultBranch) {
        throw new NotFoundException('No active branch found.');
      }
      branchId = defaultBranch.id;
    }

    const challanNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'DELIVERY_CHALLAN',
      'DC'
    );

    return this.prisma.deliveryChallan.create({
      data: {
        organizationId,
        branchId,
        customerId: dto.customerId,
        challanNumber,
        challanDate: dto.challanDate ? new Date(dto.challanDate) : new Date(),
        vehicleNumber: dto.vehicleNumber,
        eWayBillNumber: dto.ewayBillNumber,
        status: 'DISPATCHED',
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        },
      },
      include: {
        lines: true,
      },
    });
  }

  // -------------------------------------------------------------
  // CREDIT NOTES (SALES RETURNS)
  // -------------------------------------------------------------
  async listCreditNotes(organizationId: string) {
    const notes = await this.prisma.creditNote.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    const customerIds = [...new Set(notes.map((n) => n.customerId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, companyName: true },
    });
    const custMap = new Map(customers.map((c) => [c.id, c]));

    return notes.map((n) => ({
      ...n,
      customer: custMap.get(n.customerId) || null,
    }));
  }

  async createCreditNote(organizationId: string, dto: CreateCreditNoteDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Credit note must specify at least one return item.');
    }

    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId },
      });
      if (!defaultBranch) {
        throw new NotFoundException('No active branch found.');
      }
      branchId = defaultBranch.id;
    }

    const noteNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'CREDIT_NOTE',
      'CN'
    );

    let taxableAmount = toDecimal(0);
    let taxAmount = toDecimal(0);
    let totalAmount = toDecimal(0);

    const linesData = dto.lines.map((l) => {
      const qty = toDecimal(l.quantity);
      const price = toDecimal(l.unitPrice);
      const rate = toDecimal(l.taxRate || 18);

      const lineTaxable = roundFinancial(qty.times(price));
      const lineTax = roundFinancial(lineTaxable.times(rate).dividedBy(100));
      const lineTotal = lineTaxable.plus(lineTax);

      taxableAmount = taxableAmount.plus(lineTaxable);
      taxAmount = taxAmount.plus(lineTax);
      totalAmount = totalAmount.plus(lineTotal);

      return {
        productId: l.productId,
        quantity: qty.toNumber(),
        unitPrice: price.toNumber(),
        lineTotal: lineTotal.toNumber(),
      };
    });

    // Create Credit Note & decrement customer balance
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.creditNote.create({
        data: {
          organizationId,
          branchId,
          customerId: dto.customerId,
          noteNumber,
          noteDate: dto.noteDate ? new Date(dto.noteDate) : new Date(),
          originalInvoiceId: dto.originalInvoiceId,
          reasonCode: dto.reasonCode || 'GOODS_RETURN',
          taxableAmount: taxableAmount.toNumber(),
          taxAmount: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          lines: {
            create: linesData,
          },
        },
        include: { lines: true },
      });

      // Reduce customer balance
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          currentBalance: {
            decrement: totalAmount.toNumber(),
          },
        },
      });

      return note;
    });
  }

  // -------------------------------------------------------------
  // DEBIT NOTES (PURCHASE RETURNS)
  // -------------------------------------------------------------
  async listDebitNotes(organizationId: string) {
    const notes = await this.prisma.debitNote.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    const supplierIds = [...new Set(notes.map((n) => n.supplierId))];
    const suppliers = await this.prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true, companyName: true },
    });
    const suppMap = new Map(suppliers.map((s) => [s.id, s]));

    return notes.map((n) => ({
      ...n,
      supplier: suppMap.get(n.supplierId) || null,
    }));
  }

  async createDebitNote(organizationId: string, dto: CreateDebitNoteDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Debit note must specify at least one return item.');
    }

    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId },
      });
      if (!defaultBranch) {
        throw new NotFoundException('No active branch found.');
      }
      branchId = defaultBranch.id;
    }

    const noteNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'DEBIT_NOTE',
      'DN'
    );

    let taxableAmount = toDecimal(0);
    let taxAmount = toDecimal(0);
    let totalAmount = toDecimal(0);

    const linesData = dto.lines.map((l) => {
      const qty = toDecimal(l.quantity);
      const cost = toDecimal(l.unitCost);
      const rate = toDecimal(l.taxRate || 18);

      const lineTaxable = roundFinancial(qty.times(cost));
      const lineTax = roundFinancial(lineTaxable.times(rate).dividedBy(100));
      const lineTotal = lineTaxable.plus(lineTax);

      taxableAmount = taxableAmount.plus(lineTaxable);
      taxAmount = taxAmount.plus(lineTax);
      totalAmount = totalAmount.plus(lineTotal);

      return {
        productId: l.productId,
        quantity: qty.toNumber(),
        unitCost: cost.toNumber(),
        lineTotal: lineTotal.toNumber(),
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const note = await tx.debitNote.create({
        data: {
          organizationId,
          branchId,
          supplierId: dto.supplierId,
          noteNumber,
          noteDate: dto.noteDate ? new Date(dto.noteDate) : new Date(),
          originalBillId: dto.originalBillId,
          reasonCode: dto.reasonCode || 'DAMAGED_SUPPLY_RETURN',
          taxableAmount: taxableAmount.toNumber(),
          taxAmount: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          lines: {
            create: linesData,
          },
        },
        include: { lines: true },
      });

      // Reduce supplier outstanding payable
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: {
          currentBalance: {
            decrement: totalAmount.toNumber(),
          },
        },
      });

      return note;
    });
  }
}
