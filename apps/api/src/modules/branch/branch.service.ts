import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBranchInput } from '@bizflow/validation';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async listBranches(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      include: {
        warehouses: true,
      },
      orderBy: { isMainBranch: 'desc' },
    });
  }

  async createBranch(organizationId: string, input: CreateBranchInput) {
    const existing = await this.prisma.branch.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: input.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Branch code "${input.code}" already exists in this organization`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.isMainBranch) {
        await tx.branch.updateMany({
          where: { organizationId },
          data: { isMainBranch: false },
        });
      }

      const branch = await tx.branch.create({
        data: {
          organizationId,
          name: input.name,
          code: input.code,
          gstin: input.gstin || null,
          addressLine1: input.addressLine1,
          city: input.city,
          state: input.state,
          stateCode: input.stateCode,
          postalCode: input.postalCode,
          isMainBranch: input.isMainBranch,
        },
      });

      // Automatically create a default warehouse for this branch
      await tx.warehouse.create({
        data: {
          organizationId,
          branchId: branch.id,
          name: `${branch.name} Warehouse`,
          code: `WH-${branch.code}`,
          isDefault: input.isMainBranch,
        },
      });

      return branch;
    });
  }
}
