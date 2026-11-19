import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DataTransferService {
  constructor(private readonly prisma: PrismaService) {}

  async exportEntity(organizationId: string, entity: string) {
    switch (entity.toLowerCase()) {
      case 'products': {
        const products = await this.prisma.product.findMany({
          where: { organizationId },
          include: { category: true, uom: true },
          orderBy: { name: 'asc' },
        });
        return products.map((p) => ({
          Name: p.name,
          SKU: p.sku,
          Category: p.category?.name || 'Uncategorized',
          HSN_SAC: p.hsnSacCode || '',
          Selling_Price: parseFloat(p.sellingPrice.toString()),
          Cost_Price: parseFloat(p.purchasePrice.toString()),
          GST_Rate: `${p.taxRate}%`,
          UOM: p.uom?.code || 'PCS',
          Min_Stock_Alert: p.reorderPoint ? parseFloat(p.reorderPoint.toString()) : 0,
        }));
      }

      case 'customers': {
        const customers = await this.prisma.customer.findMany({
          where: { organizationId },
          orderBy: { name: 'asc' },
        });
        return customers.map((c) => ({
          Name: c.name,
          Company: c.companyName || '',
          Phone: c.phone || '',
          Email: c.email || '',
          GSTIN: c.gstin || '',
          Party_Type: c.partyType,
          State: c.state,
          State_Code: c.stateCode,
          Outstanding_Balance: parseFloat(c.currentBalance.toString()),
        }));
      }

      case 'invoices': {
        const invoices = await this.prisma.salesInvoice.findMany({
          where: { organizationId },
          include: { customer: true, items: true },
          orderBy: { invoiceDate: 'desc' },
        });
        return invoices.map((inv) => ({
          Invoice_Number: inv.invoiceNumber,
          Date: inv.invoiceDate.toISOString().split('T')[0],
          Due_Date: inv.dueDate.toISOString().split('T')[0],
          Customer_Name: inv.customer?.name || 'Cash Sale',
          Place_of_Supply: inv.placeOfSupply,
          Taxable_Value: parseFloat(inv.subtotalAmount.toString()),
          CGST: parseFloat(inv.cgstAmount.toString()),
          SGST: parseFloat(inv.sgstAmount.toString()),
          IGST: parseFloat(inv.igstAmount.toString()),
          Total_Tax: parseFloat(inv.totalTaxAmount.toString()),
          Grand_Total: parseFloat(inv.totalAmount.toString()),
          Status: inv.status,
          Item_Count: inv.items.length,
        }));
      }

      case 'tally-xml': {
        const org = await this.prisma.organization.findUnique({
          where: { id: organizationId },
        });
        const customers = await this.prisma.customer.findMany({
          where: { organizationId },
        });
        const invoices = await this.prisma.salesInvoice.findMany({
          where: { organizationId },
          include: { customer: true, items: true },
          take: 50,
        });

        // Construct standard Tally XML envelope
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters and Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

        // Tally Ledgers
        for (const c of customers) {
          xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <LEDGER NAME="${c.name.replace(/&/g, '&amp;')}" ACTION="Create">\n            <NAME>${c.name.replace(/&/g, '&amp;')}</NAME>\n            <PARENT>Sundry Debtors</PARENT>\n            <OPENINGBALANCE>${c.currentBalance}</OPENINGBALANCE>\n            <PARTYGSTIN>${c.gstin || ''}</PARTYGSTIN>\n          </LEDGER>\n        </TALLYMESSAGE>\n`;
        }

        // Tally Sales Vouchers
        for (const inv of invoices) {
          const invDate = inv.invoiceDate.toISOString().slice(0, 10).replace(/-/g, '');
          xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n            <DATE>${invDate}</DATE>\n            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>\n            <PARTYLEDGERNAME>${(inv.customer?.name || 'Cash').replace(/&/g, '&amp;')}</PARTYLEDGERNAME>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>${(inv.customer?.name || 'Cash').replace(/&/g, '&amp;')}</LEDGERNAME>\n              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n              <AMOUNT>-${inv.totalAmount}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>Sales Account</LEDGERNAME>\n              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n              <AMOUNT>${inv.subtotalAmount}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n          </VOUCHER>\n        </TALLYMESSAGE>\n`;
        }

        xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
        return {
          filename: `Tally_Import_${(org?.name || 'BizFlow').replace(/\s+/g, '_')}.xml`,
          format: 'xml',
          data: xml,
        };
      }

      default:
        throw new BadRequestException(`Unsupported export entity: ${entity}`);
    }
  }

  async importProducts(organizationId: string, items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('No items provided for import.');
    }

    let importedCount = 0;
    for (const item of items) {
      const name = item.Name || item.name;
      const sku = (item.SKU || item.sku || `SKU-${Date.now().toString().slice(-4)}`).toUpperCase();
      const sellingPrice = parseFloat(item.Selling_Price || item.sellingPrice || '0');
      const purchasePrice = parseFloat(item.Cost_Price || item.purchasePrice || '0');
      const taxRate = parseFloat(item.GST_Rate || item.taxRate || '18');

      if (!name) continue;

      await this.prisma.product.upsert({
        where: {
          organizationId_sku: {
            organizationId,
            sku,
          },
        },
        update: {
          name,
          sellingPrice,
          purchasePrice,
          taxRate,
        },
        create: {
          organizationId,
          name,
          sku,
          sellingPrice,
          purchasePrice,
          taxRate,
        },
      });
      importedCount++;
    }

    return {
      message: `Successfully imported / updated ${importedCount} products.`,
      count: importedCount,
    };
  }

  async generateFullBackupSnapshot(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    const branches = await this.prisma.branch.findMany({ where: { organizationId } });
    const customers = await this.prisma.customer.findMany({ where: { organizationId } });
    const suppliers = await this.prisma.supplier.findMany({ where: { organizationId } });
    const products = await this.prisma.product.findMany({ where: { organizationId } });
    const accounts = await this.prisma.account.findMany({ where: { organizationId } });
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId },
      include: { items: true },
    });
    const expenses = await this.prisma.expense.findMany({ where: { organizationId } });
    const bankAccounts = await this.prisma.bankAccount.findMany({ where: { organizationId } });

    const snapshot = {
      meta: {
        application: 'BizFlow ERP & Vyapar Suite',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        organization: org?.name,
        organizationId,
      },
      counts: {
        branches: branches.length,
        customers: customers.length,
        suppliers: suppliers.length,
        products: products.length,
        accounts: accounts.length,
        invoices: invoices.length,
        expenses: expenses.length,
        bankAccounts: bankAccounts.length,
      },
      data: {
        branches,
        customers,
        suppliers,
        products,
        accounts,
        invoices,
        expenses,
        bankAccounts,
      },
    };

    return snapshot;
  }
}
