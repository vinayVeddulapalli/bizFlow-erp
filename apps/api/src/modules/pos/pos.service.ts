import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalesInvoiceService } from '../sales/sales-invoice.service';
import { PaymentService } from '../sales/payment.service';
import { toDecimal } from '@bizflow/shared-utils';

export interface PosCheckoutItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  hsnCode?: string;
  notes?: string;
}

export interface PosPaymentSplitInput {
  mode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  amount: number;
  referenceNo?: string;
}

export interface PosCheckoutInput {
  registerId: string;
  sessionId: string;
  branchId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: PosCheckoutItemInput[];
  payments: PosPaymentSplitInput[];
  discountTotal?: number;
  notes?: string;
}

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: SalesInvoiceService,
    private readonly paymentService: PaymentService
  ) {}

  async listRegisters(organizationId: string, branchId?: string) {
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId },
        orderBy: { isMainBranch: 'desc' },
      });
      targetBranchId = defaultBranch ? defaultBranch.id : undefined;
    }

    if (!targetBranchId) {
      return [];
    }

    let registers = await this.prisma.posRegister.findMany({
      where: { organizationId, branchId: targetBranchId },
      include: {
        sessions: {
          where: { status: 'OPEN' },
          take: 1,
          orderBy: { openedAt: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Auto-seed default POS register if none exist
    if (registers.length === 0) {
      const defaultRegister = await this.prisma.posRegister.create({
        data: {
          organizationId,
          branchId: targetBranchId,
          name: 'Main Checkout Counter 1',
          code: 'POS-01',
          isActive: true,
        },
      });
      registers = [{ ...defaultRegister, sessions: [] }];
    }

    return registers.map((reg) => ({
      id: reg.id,
      name: reg.name,
      code: reg.code,
      isActive: reg.isActive,
      hasActiveSession: reg.sessions.length > 0,
      activeSessionId: reg.sessions[0]?.id || null,
    }));
  }

  async getActiveSession(organizationId: string, registerId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: { organizationId, registerId, status: 'OPEN' },
      include: {
        register: true,
        payments: true,
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    let cashCollected = toDecimal(0);
    let upiCollected = toDecimal(0);
    let cardCollected = toDecimal(0);
    let totalSales = toDecimal(0);

    session.payments.forEach((p) => {
      const amt = toDecimal(p.amount.toString());
      totalSales = totalSales.plus(amt);
      if (p.paymentMode === 'CASH') cashCollected = cashCollected.plus(amt);
      else if (p.paymentMode === 'UPI') upiCollected = upiCollected.plus(amt);
      else if (p.paymentMode === 'CARD') cardCollected = cardCollected.plus(amt);
    });

    const openingFloat = toDecimal(session.openingFloat.toString());
    const expectedCashInDrawer = openingFloat.plus(cashCollected);

    return {
      id: session.id,
      registerId: session.registerId,
      registerName: session.register.name,
      registerCode: session.register.code,
      status: session.status,
      openedAt: session.openedAt,
      openingFloat: openingFloat.toFixed(2),
      cashCollected: cashCollected.toFixed(2),
      upiCollected: upiCollected.toFixed(2),
      cardCollected: cardCollected.toFixed(2),
      totalSales: totalSales.toFixed(2),
      expectedCashInDrawer: expectedCashInDrawer.toFixed(2),
      invoiceCount: session.payments.length,
    };
  }

  async openSession(organizationId: string, userId: string, data: { registerId: string; openingFloat: number; notes?: string }) {
    const active = await this.getActiveSession(organizationId, data.registerId);
    if (active) {
      return active;
    }

    const session = await this.prisma.posSession.create({
      data: {
        organizationId,
        registerId: data.registerId,
        openedById: userId,
        openingFloat: data.openingFloat || 0,
        status: 'OPEN',
        notes: data.notes || undefined,
      },
      include: { register: true },
    });

    return {
      id: session.id,
      registerId: session.registerId,
      registerName: session.register.name,
      registerCode: session.register.code,
      status: session.status,
      openedAt: session.openedAt,
      openingFloat: toDecimal(session.openingFloat.toString()).toFixed(2),
      cashCollected: '0.00',
      upiCollected: '0.00',
      cardCollected: '0.00',
      totalSales: '0.00',
      expectedCashInDrawer: toDecimal(session.openingFloat.toString()).toFixed(2),
      invoiceCount: 0,
    };
  }

  async closeSession(organizationId: string, userId: string, data: { sessionId: string; closingCash: number; notes?: string }) {
    const session = await this.prisma.posSession.findFirst({
      where: { id: data.sessionId, organizationId, status: 'OPEN' },
      include: { payments: true },
    });

    if (!session) {
      throw new NotFoundException('Open POS session not found');
    }

    let cashCollected = toDecimal(0);
    session.payments.forEach((p) => {
      if (p.paymentMode === 'CASH') {
        cashCollected = cashCollected.plus(toDecimal(p.amount.toString()));
      }
    });

    const openingFloat = toDecimal(session.openingFloat.toString());
    const expectedCash = openingFloat.plus(cashCollected);
    const closingCash = toDecimal(data.closingCash || 0);
    const cashDifference = closingCash.minus(expectedCash);

    const updated = await this.prisma.posSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedById: userId,
        closedAt: new Date(),
        closingCash: closingCash.toNumber(),
        expectedCash: expectedCash.toNumber(),
        cashDifference: cashDifference.toNumber(),
        notes: data.notes || undefined,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      closedAt: updated.closedAt,
      openingFloat: openingFloat.toFixed(2),
      cashCollected: cashCollected.toFixed(2),
      closingCash: closingCash.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      cashDifference: cashDifference.toFixed(2),
    };
  }

  async checkout(organizationId: string, _userId: string, data: PosCheckoutInput) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('POS checkout cart cannot be empty');
    }

    // 1. Resolve Branch
    let branchId = data.branchId;
    if (!branchId) {
      const reg = await this.prisma.posRegister.findFirst({ where: { id: data.registerId, organizationId } });
      branchId = reg?.branchId;
    }
    if (!branchId) {
      const defBranch = await this.prisma.branch.findFirst({ where: { organizationId } });
      branchId = defBranch?.id;
    }
    if (!branchId) {
      throw new NotFoundException('Operating branch not configured for POS');
    }

    // 2. Resolve Customer (Default to "Walk-in Retail Customer" if not selected)
    let customerId = data.customerId;
    if (!customerId) {
      let walkIn = await this.prisma.customer.findFirst({
        where: { organizationId, name: { contains: 'Walk-in', mode: 'insensitive' } },
      });
      if (!walkIn) {
        walkIn = await this.prisma.customer.create({
          data: {
            organizationId,
            name: data.customerName || 'Walk-in Retail Customer',
            phone: data.customerPhone || '9999999999',
            partyType: 'UNREGISTERED',
            state: 'Maharashtra',
            stateCode: '27',
            billingAddress: 'Counter Retail Sale',
          },
        });
      }
      customerId = walkIn.id;
    }

    // 3. Prepare Sales Invoice Line Items
    const productIds = data.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId },
    });
    const prodMap = new Map(products.map((p) => [p.id, p]));

    const invoiceItems = data.items.map((item) => {
      const prod = prodMap.get(item.productId);
      return {
        productId: item.productId,
        description: item.notes || prod?.name || 'Retail Product Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: 0,
        discountAmount: item.discountAmount || 0,
        taxRate: item.taxRate !== undefined ? item.taxRate : prod ? Number(prod.taxRate) : 18,
        hsnSacCode: item.hsnCode || prod?.hsnSacCode || '998311',
      };
    });

    // 4. Create and Post the Sales Invoice
    const createdInvoice = await this.invoiceService.createInvoice(organizationId, {
      customerId,
      branchId,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      placeOfSupply: '27',
      items: invoiceItems,
      notes: data.notes || 'POS Retail Counter Bill',
      terms: 'Thank you for your purchase! Goods once sold are subject to store return policy.',
    });

    const postedInvoice = await this.invoiceService.postInvoice(organizationId, createdInvoice.id);

    // 5. Record Payments & Tender Splits
    const totalInvoiceAmount = toDecimal(postedInvoice.totalAmount.toString());
    const paymentLines = [];

    for (const payment of data.payments) {
      const payAmount = toDecimal(payment.amount);
      if (payAmount.greaterThan(0)) {
        // Record payment in ledger
        await this.paymentService.recordPayment(organizationId, {
          customerId,
          amount: payAmount.toNumber(),
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMode: payment.mode === 'UPI' ? 'UPI' : payment.mode === 'CARD' ? 'BANK_TRANSFER' : 'CASH',
          referenceNo: payment.referenceNo || `POS-${postedInvoice.invoiceNumber}`,
          notes: `POS Shift ${data.sessionId} - ${payment.mode}`,
          allocations: [
            {
              invoiceId: postedInvoice.id,
              allocatedAmount: payAmount.toNumber(),
            },
          ],
        });

        // Record POS Payment Line
        const pLine = await this.prisma.posPaymentLine.create({
          data: {
            organizationId,
            sessionId: data.sessionId,
            invoiceId: postedInvoice.id,
            paymentMode: payment.mode,
            amount: payAmount.toNumber(),
            referenceNo: payment.referenceNo || undefined,
          },
        });
        paymentLines.push(pLine);
      }
    }

    // 6. Generate Clean Thermal ESC/POS Receipt Text
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const thermalReceipt = this.generateThermalReceiptText(org, postedInvoice, data.payments);

    // 7. UPI QR Code Payload String (BharatPe / NPCI UPI Spec)
    // Format: upi://pay?pa=merchant@upi&pn=OrgName&am=Amount&cu=INR&tn=InvoiceNo
    const upiQrString = `upi://pay?pa=bizflow.retail@okaxis&pn=${encodeURIComponent(
      org?.name || 'BizFlow Store'
    )}&am=${totalInvoiceAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(postedInvoice.invoiceNumber || 'POS-BILL')}`;

    return {
      success: true,
      invoice: postedInvoice,
      paymentLines,
      thermalReceipt,
      upiQrString,
    };
  }

  private generateThermalReceiptText(org: any, invoice: any, payments: PosPaymentSplitInput[]): string {
    const storeName = (org?.name || 'BIZFLOW RETAIL STORE').toUpperCase();
    const gstin = org?.gstin ? `GSTIN: ${org.gstin}` : 'RETAIL TAX INVOICE';
    const invNo = `Bill No: ${invoice.invoiceNumber || 'DRAFT'}`;
    const dateStr = `Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`;

    const lines: string[] = [];
    lines.push('================================');
    lines.push(storeName.padStart(Math.floor((32 + storeName.length) / 2)));
    lines.push(gstin.padStart(Math.floor((32 + gstin.length) / 2)));
    lines.push('================================');
    lines.push(`${invNo.padEnd(16)}${dateStr.padStart(16)}`);
    lines.push('--------------------------------');
    lines.push('ITEM         QTY    RATE   TOTAL');
    lines.push('--------------------------------');

    invoice.items?.forEach((it: any) => {
      const name = (it.product?.name || it.description || 'Item').substring(0, 11).padEnd(11);
      const qty = parseFloat(it.quantity.toString()).toFixed(0).padStart(4);
      const rate = parseFloat(it.unitPrice.toString()).toFixed(1).padStart(7);
      const total = parseFloat(it.totalAmount.toString()).toFixed(1).padStart(8);
      lines.push(`${name} ${qty} ${rate} ${total}`);
    });

    lines.push('--------------------------------');
    const totalTaxable = `Taxable: Rs. ${parseFloat(invoice.taxableAmount.toString()).toFixed(2)}`;
    const totalTax = `Tax (GST): Rs. ${parseFloat(invoice.totalTax.toString()).toFixed(2)}`;
    const grandTotal = `TOTAL: Rs. ${parseFloat(invoice.totalAmount.toString()).toFixed(2)}`;

    lines.push(totalTaxable.padStart(32));
    lines.push(totalTax.padStart(32));
    lines.push(grandTotal.padStart(32));
    lines.push('================================');

    payments.forEach((p) => {
      lines.push(`Paid via ${p.mode}: Rs. ${p.amount.toFixed(2)}`.padStart(32));
    });

    lines.push('================================');
    lines.push('  THANK YOU! VISIT AGAIN  ');
    lines.push('================================');

    return lines.join('\n');
  }
}
