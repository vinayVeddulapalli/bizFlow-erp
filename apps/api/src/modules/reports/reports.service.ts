import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgingAnalysis(organizationId: string, type: 'RECEIVABLES' | 'PAYABLES') {
    const now = new Date();

    const buckets = {
      current: { range: 'Current (Not Due)', amount: toDecimal(0), invoiceCount: 0, invoices: [] as any[] },
      days1to30: { range: '1 - 30 Days Overdue', amount: toDecimal(0), invoiceCount: 0, invoices: [] as any[] },
      days31to60: { range: '31 - 60 Days Overdue', amount: toDecimal(0), invoiceCount: 0, invoices: [] as any[] },
      days61to90: { range: '61 - 90 Days Overdue', amount: toDecimal(0), invoiceCount: 0, invoices: [] as any[] },
      days90Plus: { range: '90+ Days Overdue', amount: toDecimal(0), invoiceCount: 0, invoices: [] as any[] },
    };

    let totalOutstanding = toDecimal(0);

    if (type === 'RECEIVABLES') {
      const invoices = await this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' },
      });

      for (const inv of invoices) {
        const dueAmount = toDecimal(inv.dueAmount.toString());
        if (dueAmount.lte(0)) continue;

        totalOutstanding = totalOutstanding.plus(dueAmount);
        const dueDate = new Date(inv.dueDate);
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const item = {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          partyName: inv.customer.name,
          date: inv.invoiceDate.toISOString().split('T')[0],
          dueDate: inv.dueDate.toISOString().split('T')[0],
          daysOverdue: Math.max(0, daysOverdue),
          totalAmount: inv.totalAmount.toString(),
          dueAmount: dueAmount.toFixed(2),
        };

        if (daysOverdue <= 0) {
          buckets.current.amount = buckets.current.amount.plus(dueAmount);
          buckets.current.invoiceCount++;
          buckets.current.invoices.push(item);
        } else if (daysOverdue <= 30) {
          buckets.days1to30.amount = buckets.days1to30.amount.plus(dueAmount);
          buckets.days1to30.invoiceCount++;
          buckets.days1to30.invoices.push(item);
        } else if (daysOverdue <= 60) {
          buckets.days31to60.amount = buckets.days31to60.amount.plus(dueAmount);
          buckets.days31to60.invoiceCount++;
          buckets.days31to60.invoices.push(item);
        } else if (daysOverdue <= 90) {
          buckets.days61to90.amount = buckets.days61to90.amount.plus(dueAmount);
          buckets.days61to90.invoiceCount++;
          buckets.days61to90.invoices.push(item);
        } else {
          buckets.days90Plus.amount = buckets.days90Plus.amount.plus(dueAmount);
          buckets.days90Plus.invoiceCount++;
          buckets.days90Plus.invoices.push(item);
        }
      }
    } else {
      const bills = await this.prisma.purchaseInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        },
        include: { supplier: true },
        orderBy: { dueDate: 'asc' },
      });

      for (const bill of bills) {
        const dueAmount = toDecimal(bill.dueAmount.toString());
        if (dueAmount.lte(0)) continue;

        totalOutstanding = totalOutstanding.plus(dueAmount);
        const dueDate = new Date(bill.dueDate);
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const item = {
          id: bill.id,
          invoiceNumber: bill.billNumber,
          partyName: bill.supplier.name,
          date: bill.billDate.toISOString().split('T')[0],
          dueDate: bill.dueDate.toISOString().split('T')[0],
          daysOverdue: Math.max(0, daysOverdue),
          totalAmount: bill.totalAmount.toString(),
          dueAmount: dueAmount.toFixed(2),
        };

        if (daysOverdue <= 0) {
          buckets.current.amount = buckets.current.amount.plus(dueAmount);
          buckets.current.invoiceCount++;
          buckets.current.invoices.push(item);
        } else if (daysOverdue <= 30) {
          buckets.days1to30.amount = buckets.days1to30.amount.plus(dueAmount);
          buckets.days1to30.invoiceCount++;
          buckets.days1to30.invoices.push(item);
        } else if (daysOverdue <= 60) {
          buckets.days31to60.amount = buckets.days31to60.amount.plus(dueAmount);
          buckets.days31to60.invoiceCount++;
          buckets.days31to60.invoices.push(item);
        } else if (daysOverdue <= 90) {
          buckets.days61to90.amount = buckets.days61to90.amount.plus(dueAmount);
          buckets.days61to90.invoiceCount++;
          buckets.days61to90.invoices.push(item);
        } else {
          buckets.days90Plus.amount = buckets.days90Plus.amount.plus(dueAmount);
          buckets.days90Plus.invoiceCount++;
          buckets.days90Plus.invoices.push(item);
        }
      }
    }

    return {
      reportType: type,
      totalOutstanding: totalOutstanding.toFixed(2),
      buckets: {
        current: { ...buckets.current, amount: buckets.current.amount.toFixed(2) },
        days1to30: { ...buckets.days1to30, amount: buckets.days1to30.amount.toFixed(2) },
        days31to60: { ...buckets.days31to60, amount: buckets.days31to60.amount.toFixed(2) },
        days61to90: { ...buckets.days61to90, amount: buckets.days61to90.amount.toFixed(2) },
        days90Plus: { ...buckets.days90Plus, amount: buckets.days90Plus.amount.toFixed(2) },
      },
    };
  }

  async getStockValuation(organizationId: string) {
    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true, type: 'GOODS' },
      include: {
        category: true,
        uom: true,
        stockLevels: true,
      },
      orderBy: { name: 'asc' },
    });

    let totalValuation = toDecimal(0);
    let totalQuantity = toDecimal(0);

    const items = products.map((p) => {
      const unitCost = toDecimal(p.purchasePrice ? p.purchasePrice.toString() : '0');
      const qty = p.stockLevels.reduce(
        (sum, sl) => sum.plus(toDecimal(sl.quantity.toString())),
        toDecimal(0)
      );
      const val = qty.times(unitCost);

      totalValuation = totalValuation.plus(val);
      totalQuantity = totalQuantity.plus(qty);

      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        categoryName: p.category?.name || 'General',
        uom: p.uom?.code || 'PCS',
        totalQuantity: qty.toFixed(2),
        unitCost: unitCost.toFixed(2),
        totalValuation: val.toFixed(2),
      };
    });

    return {
      asOfDate: new Date().toISOString(),
      totalItems: products.length,
      totalQuantity: totalQuantity.toFixed(2),
      totalValuation: totalValuation.toFixed(2),
      items,
    };
  }

  async getRegister(organizationId: string, type: 'SALES' | 'PURCHASE') {
    let totalTaxable = toDecimal(0);
    let totalTax = toDecimal(0);
    let totalAmount = toDecimal(0);

    let transactions: any[] = [];

    if (type === 'SALES') {
      const invoices = await this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
        },
        include: { customer: true },
        orderBy: { invoiceDate: 'desc' },
      });

      transactions = invoices.map((inv) => {
        const taxable = toDecimal(inv.subtotalAmount.toString());
        const tax = toDecimal(inv.totalTaxAmount.toString());
        const tot = toDecimal(inv.totalAmount.toString());

        totalTaxable = totalTaxable.plus(taxable);
        totalTax = totalTax.plus(tax);
        totalAmount = totalAmount.plus(tot);

        return {
          id: inv.id,
          date: inv.invoiceDate.toISOString().split('T')[0],
          documentNumber: inv.invoiceNumber,
          partyName: inv.customer.name,
          partyGstin: inv.customer.gstin,
          taxableAmount: taxable.toFixed(2),
          cgstAmount: toDecimal(inv.cgstAmount.toString()).toFixed(2),
          sgstAmount: toDecimal(inv.sgstAmount.toString()).toFixed(2),
          igstAmount: toDecimal(inv.igstAmount.toString()).toFixed(2),
          totalTax: tax.toFixed(2),
          totalAmount: tot.toFixed(2),
          status: inv.status,
        };
      });
    } else {
      const bills = await this.prisma.purchaseInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
        },
        include: { supplier: true },
        orderBy: { billDate: 'desc' },
      });

      transactions = bills.map((b) => {
        const taxable = toDecimal(b.subtotalAmount.toString());
        const tax = toDecimal(b.totalTaxAmount.toString());
        const tot = toDecimal(b.totalAmount.toString());

        totalTaxable = totalTaxable.plus(taxable);
        totalTax = totalTax.plus(tax);
        totalAmount = totalAmount.plus(tot);

        return {
          id: b.id,
          date: b.billDate.toISOString().split('T')[0],
          documentNumber: b.billNumber,
          partyName: b.supplier.name,
          partyGstin: b.supplier.gstin,
          taxableAmount: taxable.toFixed(2),
          cgstAmount: toDecimal(b.cgstAmount.toString()).toFixed(2),
          sgstAmount: toDecimal(b.sgstAmount.toString()).toFixed(2),
          igstAmount: toDecimal(b.igstAmount.toString()).toFixed(2),
          totalTax: tax.toFixed(2),
          totalAmount: tot.toFixed(2),
          status: b.status,
        };
      });
    }

    return {
      registerType: type,
      totalTaxable: totalTaxable.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      transactions,
    };
  }
}
