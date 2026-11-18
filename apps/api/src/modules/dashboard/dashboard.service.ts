import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    // 1. Fetch organization counts
    const [branchCount, warehouseCount, memberCount, recentLogs] = await Promise.all([
      this.prisma.branch.count({ where: { organizationId } }),
      this.prisma.warehouse.count({ where: { organizationId } }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { fullName: true, email: true },
          },
        },
      }),
    ]);

    // Financial KPI Aggregates (calculated from real DB tables)
    // In Phase 1 initial baseline, sales and purchase tables will be added in Phase 2
    return {
      kpis: {
        totalSales: '0.00',
        totalPurchases: '0.00',
        outstandingReceivables: '0.00',
        outstandingPayables: '0.00',
        netCashFlow: '0.00',
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
