import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class GstReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getGstr1(organizationId: string, _fiscalYear?: string, _month?: number) {
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: { uom: true },
            },
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const b2b: any[] = [];
    const b2csMap = new Map<string, { placeOfSupply: string; taxRate: string; taxableAmount: any; cgstAmount: any; sgstAmount: any; igstAmount: any; totalAmount: any }>();
    const hsnMap = new Map<string, { hsnSacCode: string; description: string; uqc: string; totalQuantity: any; taxableAmount: any; cgstAmount: any; sgstAmount: any; igstAmount: any; totalAmount: any }>();

    let totalTaxable = toDecimal(0);
    let totalCgst = toDecimal(0);
    let totalSgst = toDecimal(0);
    let totalIgst = toDecimal(0);
    let totalInvoiceValue = toDecimal(0);

    for (const inv of invoices) {
      const invTaxable = toDecimal(inv.subtotalAmount.toString());
      const invCgst = toDecimal(inv.cgstAmount.toString());
      const invSgst = toDecimal(inv.sgstAmount.toString());
      const invIgst = toDecimal(inv.igstAmount.toString());
      const invTotal = toDecimal(inv.totalAmount.toString());

      totalTaxable = totalTaxable.plus(invTaxable);
      totalCgst = totalCgst.plus(invCgst);
      totalSgst = totalSgst.plus(invSgst);
      totalIgst = totalIgst.plus(invIgst);
      totalInvoiceValue = totalInvoiceValue.plus(invTotal);

      // Check if B2B (Customer has valid GSTIN)
      if (inv.customer.gstin && inv.customer.gstin.trim().length >= 15) {
        b2b.push({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate.toISOString().split('T')[0],
          customerName: inv.customer.name,
          customerGstin: inv.customer.gstin,
          placeOfSupply: inv.placeOfSupply,
          taxableAmount: invTaxable.toFixed(2),
          cgstAmount: invCgst.toFixed(2),
          sgstAmount: invSgst.toFixed(2),
          igstAmount: invIgst.toFixed(2),
          totalAmount: invTotal.toFixed(2),
        });
      } else {
        // B2C Small
        const key = `${inv.placeOfSupply}`;
        if (!b2csMap.has(key)) {
          b2csMap.set(key, {
            placeOfSupply: inv.placeOfSupply,
            taxRate: '18%',
            taxableAmount: toDecimal(0),
            cgstAmount: toDecimal(0),
            sgstAmount: toDecimal(0),
            igstAmount: toDecimal(0),
            totalAmount: toDecimal(0),
          });
        }
        const b2cEntry = b2csMap.get(key)!;
        b2cEntry.taxableAmount = b2cEntry.taxableAmount.plus(invTaxable);
        b2cEntry.cgstAmount = b2cEntry.cgstAmount.plus(invCgst);
        b2cEntry.sgstAmount = b2cEntry.sgstAmount.plus(invSgst);
        b2cEntry.igstAmount = b2cEntry.igstAmount.plus(invIgst);
        b2cEntry.totalAmount = b2cEntry.totalAmount.plus(invTotal);
      }

      // HSN Summary aggregation
      for (const item of inv.items) {
        const hsn = item.hsnSacCode || 'N/A';
        const qty = toDecimal(item.quantity.toString());
        const taxable = toDecimal(item.taxableAmount.toString());
        const cgst = toDecimal(item.cgstAmount.toString());
        const sgst = toDecimal(item.sgstAmount.toString());
        const igst = toDecimal(item.igstAmount.toString());
        const total = toDecimal(item.totalAmount.toString());

        if (!hsnMap.has(hsn)) {
          hsnMap.set(hsn, {
            hsnSacCode: hsn,
            description: item.product?.name || item.description || 'Goods/Services',
            uqc: item.product?.uom?.code || 'PCS',
            totalQuantity: toDecimal(0),
            taxableAmount: toDecimal(0),
            cgstAmount: toDecimal(0),
            sgstAmount: toDecimal(0),
            igstAmount: toDecimal(0),
            totalAmount: toDecimal(0),
          });
        }

        const hsnEntry = hsnMap.get(hsn)!;
        hsnEntry.totalQuantity = hsnEntry.totalQuantity.plus(qty);
        hsnEntry.taxableAmount = hsnEntry.taxableAmount.plus(taxable);
        hsnEntry.cgstAmount = hsnEntry.cgstAmount.plus(cgst);
        hsnEntry.sgstAmount = hsnEntry.sgstAmount.plus(sgst);
        hsnEntry.igstAmount = hsnEntry.igstAmount.plus(igst);
        hsnEntry.totalAmount = hsnEntry.totalAmount.plus(total);
      }
    }

    const b2cs = Array.from(b2csMap.values()).map((e) => ({
      placeOfSupply: e.placeOfSupply,
      taxRate: e.taxRate,
      taxableAmount: e.taxableAmount.toFixed(2),
      cgstAmount: e.cgstAmount.toFixed(2),
      sgstAmount: e.sgstAmount.toFixed(2),
      igstAmount: e.igstAmount.toFixed(2),
      totalAmount: e.totalAmount.toFixed(2),
    }));

    const hsnSummary = Array.from(hsnMap.values()).map((e) => ({
      hsnSacCode: e.hsnSacCode,
      description: e.description,
      uqc: e.uqc,
      totalQuantity: e.totalQuantity.toFixed(2),
      taxableAmount: e.taxableAmount.toFixed(2),
      cgstAmount: e.cgstAmount.toFixed(2),
      sgstAmount: e.sgstAmount.toFixed(2),
      igstAmount: e.igstAmount.toFixed(2),
      totalAmount: e.totalAmount.toFixed(2),
    }));

    const totalTax = totalCgst.plus(totalSgst).plus(totalIgst);

    return {
      fiscalYear: '2026-27',
      month: new Date().getMonth() + 1,
      b2b,
      b2cs,
      hsnSummary,
      totals: {
        taxableAmount: totalTaxable.toFixed(2),
        cgstAmount: totalCgst.toFixed(2),
        sgstAmount: totalSgst.toFixed(2),
        igstAmount: totalIgst.toFixed(2),
        totalTax: totalTax.toFixed(2),
        invoiceValue: totalInvoiceValue.toFixed(2),
      },
    };
  }

  async getGstr3b(organizationId: string, _fiscalYear?: string, _month?: number) {
    const [salesInvoices, purchaseBills] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
        },
        select: {
          subtotalAmount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
        },
      }),
      this.prisma.purchaseInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] },
        },
        select: {
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
        },
      }),
    ]);

    // Calculate Outward Supplies (Tax liability)
    let outwardTaxable = toDecimal(0);
    let outwardCgst = toDecimal(0);
    let outwardSgst = toDecimal(0);
    let outwardIgst = toDecimal(0);

    for (const inv of salesInvoices) {
      outwardTaxable = outwardTaxable.plus(toDecimal(inv.subtotalAmount.toString()));
      outwardCgst = outwardCgst.plus(toDecimal(inv.cgstAmount.toString()));
      outwardSgst = outwardSgst.plus(toDecimal(inv.sgstAmount.toString()));
      outwardIgst = outwardIgst.plus(toDecimal(inv.igstAmount.toString()));
    }

    const totalOutwardTax = outwardCgst.plus(outwardSgst).plus(outwardIgst);

    // Calculate Inward Supplies (Eligible Input Tax Credit - ITC)
    let itcCgst = toDecimal(0);
    let itcSgst = toDecimal(0);
    let itcIgst = toDecimal(0);

    for (const bill of purchaseBills) {
      itcCgst = itcCgst.plus(toDecimal(bill.cgstAmount.toString()));
      itcSgst = itcSgst.plus(toDecimal(bill.sgstAmount.toString()));
      itcIgst = itcIgst.plus(toDecimal(bill.igstAmount.toString()));
    }

    const totalItc = itcCgst.plus(itcSgst).plus(itcIgst);

    // Net tax payable (Output minus ITC)
    const netCgst = outwardCgst.minus(itcCgst);
    const netSgst = outwardSgst.minus(itcSgst);
    const netIgst = outwardIgst.minus(itcIgst);
    const netPayable = netCgst.plus(netSgst).plus(netIgst);

    return {
      fiscalYear: '2026-27',
      month: new Date().getMonth() + 1,
      outwardSupplies: {
        taxableAmount: outwardTaxable.toFixed(2),
        igstAmount: outwardIgst.toFixed(2),
        cgstAmount: outwardCgst.toFixed(2),
        sgstAmount: outwardSgst.toFixed(2),
        totalTax: totalOutwardTax.toFixed(2),
      },
      eligibleItc: {
        igstAmount: itcIgst.toFixed(2),
        cgstAmount: itcCgst.toFixed(2),
        sgstAmount: itcSgst.toFixed(2),
        totalItc: totalItc.toFixed(2),
      },
      netTaxPayable: {
        igstAmount: netIgst.toFixed(2),
        cgstAmount: netCgst.toFixed(2),
        sgstAmount: netSgst.toFixed(2),
        totalPayable: netPayable.toFixed(2),
      },
    };
  }
}
