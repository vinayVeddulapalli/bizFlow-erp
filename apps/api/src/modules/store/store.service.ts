import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import { Prisma } from '@prisma/client';

export interface CreateStoreOrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateStoreOrderDto {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CreateStoreOrderItemDto[];
}

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService,
  ) {}

  async getPublicStoreInfo(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        legalName: true,
        gstin: true,
        currencyCode: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Store organization not found.');
    }

    const templateConfig = await this.prisma.invoiceTemplateConfig.findUnique({
      where: { organizationId },
    });

    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      include: {
        category: true,
        stockLevels: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const catalog = products.map((p) => {
      const totalStock = p.stockLevels.reduce(
        (sum, s) => sum + parseFloat(s.quantity.toString()),
        0,
      );
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        sellingPrice: parseFloat(p.sellingPrice.toString()),
        taxRate: parseFloat(p.taxRate.toString()),
        category: p.category?.name || 'General',
        totalStock,
        inStock: totalStock > 0,
      };
    });

    return {
      store: {
        id: org.id,
        name: org.name,
        legalName: org.legalName,
        gstin: org.gstin,
        currency: org.currencyCode || 'INR',
        themeColor: templateConfig?.headerColor || '#0d9488',
      },
      products: catalog,
    };
  }

  async placeOnlineOrder(organizationId: string, dto: CreateStoreOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    let totalAmount = new Prisma.Decimal(0);
    const lineCreations = dto.items.map((item) => {
      const qty = new Prisma.Decimal(item.quantity);
      const price = new Prisma.Decimal(item.unitPrice);
      const lineTotal = qty.mul(price);
      totalAmount = totalAmount.add(lineTotal);

      return {
        productId: item.productId,
        productName: item.productName,
        quantity: qty,
        unitPrice: price,
        lineTotal: lineTotal,
      };
    });

    let orderNumber: string;
    try {
      orderNumber = await this.sequenceService.getNextNumber(
        organizationId,
        'ONLINE_ORDER',
        'ORD',
      );
    } catch {
      orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    }

    const order = await this.prisma.onlineOrder.create({
      data: {
        organizationId,
        orderNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress,
        totalAmount,
        status: 'NEW',
        lines: {
          create: lineCreations,
        },
      },
      include: {
        lines: true,
      },
    });

    return order;
  }

  async listStoreOrders(organizationId: string) {
    return this.prisma.onlineOrder.findMany({
      where: { organizationId },
      include: {
        lines: true,
      },
      orderBy: { placedAt: 'desc' },
    });
  }

  async updateOrderStatus(
    organizationId: string,
    orderId: string,
    status: string,
  ) {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, organizationId },
    });

    if (!order) {
      throw new NotFoundException('Online order not found.');
    }

    return this.prisma.onlineOrder.update({
      where: { id: orderId },
      data: { status },
      include: { lines: true },
    });
  }

  async convertOrderToInvoice(
    organizationId: string,
    orderId: string,
    branchId?: string,
  ) {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { lines: true },
    });

    if (!order) {
      throw new NotFoundException('Online order not found.');
    }

    if (order.status === 'CONVERTED' || order.convertedInvoiceId) {
      throw new BadRequestException('This order has already been converted to an invoice.');
    }

    let customer = await this.prisma.customer.findFirst({
      where: { organizationId, phone: order.customerPhone },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          organizationId,
          name: order.customerName,
          phone: order.customerPhone,
          billingAddress: order.customerAddress || 'Direct Online Customer',
          state: 'Maharashtra',
          stateCode: '27',
          currentBalance: new Prisma.Decimal(0),
        },
      });
    }

    let branch = branchId
      ? await this.prisma.branch.findFirst({ where: { id: branchId, organizationId } })
      : await this.prisma.branch.findFirst({ where: { organizationId } });

    if (!branch) {
      throw new NotFoundException('No active branch found for invoice generation.');
    }

    const isInterState = branch.stateCode !== customer.stateCode;
    const invoiceNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'SALES_INVOICE',
      'INV',
    );

    let subtotalAmount = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    let cgstTotal = new Prisma.Decimal(0);
    let sgstTotal = new Prisma.Decimal(0);
    let igstTotal = new Prisma.Decimal(0);

    const invoiceLines = order.lines.map((item) => {
      const qty = item.quantity;
      const price = item.unitPrice;
      const taxable = qty.mul(price);
      const taxRate = new Prisma.Decimal(18); // standard default GST
      const taxAmount = taxable.mul(taxRate).div(100);
      const lineTotal = taxable.add(taxAmount);

      subtotalAmount = subtotalAmount.add(taxable);
      totalTax = totalTax.add(taxAmount);

      let cgst = new Prisma.Decimal(0);
      let sgst = new Prisma.Decimal(0);
      let igst = new Prisma.Decimal(0);

      if (isInterState) {
        igst = taxAmount;
        igstTotal = igstTotal.add(igst);
      } else {
        cgst = taxAmount.div(2);
        sgst = taxAmount.div(2);
        cgstTotal = cgstTotal.add(cgst);
        sgstTotal = sgstTotal.add(sgst);
      }

      return {
        productId: item.productId,
        description: item.productName,
        hsnSacCode: '847130',
        quantity: qty,
        unitPrice: price,
        discountAmount: 0,
        taxableAmount: taxable,
        taxRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
      };
    });

    const grandTotal = subtotalAmount.add(totalTax);

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        organizationId,
        branchId: branch.id,
        customerId: customer.id,
        invoiceNumber,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        placeOfSupply: customer.stateCode || '27',
        subtotalAmount,
        discountAmount: 0,
        cgstAmount: cgstTotal,
        sgstAmount: sgstTotal,
        igstAmount: igstTotal,
        totalTaxAmount: totalTax,
        roundOffAmount: 0,
        totalAmount: grandTotal,
        paidAmount: 0,
        dueAmount: grandTotal,
        status: 'POSTED',
        notes: `Generated from Online Order #${order.orderNumber}`,
        items: {
          create: invoiceLines,
        },
      },
    });

    // Update customer outstanding balance
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        currentBalance: {
          increment: grandTotal,
        },
      },
    });

    // Mark Online Order as converted
    const updatedOrder = await this.prisma.onlineOrder.update({
      where: { id: orderId },
      data: {
        status: 'CONVERTED',
        convertedInvoiceId: invoice.id,
      },
      include: { lines: true },
    });

    return {
      message: `Online order successfully converted to Tax Invoice ${invoice.invoiceNumber}`,
      invoice,
      order: updatedOrder,
    };
  }
}
