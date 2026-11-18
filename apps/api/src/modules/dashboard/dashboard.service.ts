import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const [
      branchCount,
      warehouseCount,
      memberCount,
      salesInvoices,
      purchaseBills,
      customers,
      suppliers,
      products,
      recentLogs,
    ] = await Promise.all([
      this.prisma.branch.count({ where: { organizationId } }),
      this.prisma.warehouse.count({ where: { organizationId } }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.prisma.salesInvoice.findMany({
        where: { organizationId, status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] } },
        select: { totalAmount: true },
      }),
      this.prisma.purchaseInvoice.findMany({
        where: { organizationId, status: { in: ['POSTED', 'PARTIALLY_PAID', 'PAID'] } },
        select: { totalAmount: true },
      }),
      this.prisma.customer.findMany({
        where: { organizationId, isActive: true },
        select: { currentBalance: true },
      }),
      this.prisma.supplier.findMany({
        where: { organizationId, isActive: true },
        select: { currentBalance: true },
      }),
      this.prisma.product.findMany({
        where: { organizationId, isActive: true, type: 'GOODS' },
        select: {
          id: true,
          name: true,
          minStockLevel: true,
          stockLevels: {
            select: { quantity: true },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    const totalSales = salesInvoices.reduce(
      (acc, inv) => acc.plus(toDecimal(inv.totalAmount.toString())),
      toDecimal(0)
    );

    const totalPurchases = purchaseBills.reduce(
      (acc, bill) => acc.plus(toDecimal(bill.totalAmount.toString())),
      toDecimal(0)
    );

    const totalReceivables = customers.reduce(
      (acc, cust) => acc.plus(toDecimal(cust.currentBalance.toString())),
      toDecimal(0)
    );

    const totalPayables = suppliers.reduce(
      (acc, supp) => acc.plus(toDecimal(supp.currentBalance.toString())),
      toDecimal(0)
    );

    let lowStockCount = 0;
    for (const prod of products) {
      const minStock = toDecimal(prod.minStockLevel ? prod.minStockLevel.toString() : '0');
      const totalStock = prod.stockLevels.reduce(
        (sum, sl) => sum.plus(toDecimal(sl.quantity.toString())),
        toDecimal(0)
      );
      if (minStock.gt(0) && totalStock.lte(minStock)) {
        lowStockCount++;
      }
    }

    return {
      kpis: {
        totalSales: totalSales.toFixed(2),
        totalPurchases: totalPurchases.toFixed(2),
        outstandingReceivables: totalReceivables.toFixed(2),
        outstandingPayables: totalPayables.toFixed(2),
        netCashFlow: totalSales.minus(totalPurchases).toFixed(2),
        totalProducts: products.length,
        lowStockItems: lowStockCount,
      },
      counts: {
        branches: branchCount,
        warehouses: warehouseCount,
        teamMembers: memberCount,
      },
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        user: log.user ? log.user.fullName : 'System',
        createdAt: log.createdAt,
      })),
    };
  }
}
