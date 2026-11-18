import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSupplierInput } from '@bizflow/validation';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async listSuppliers(organizationId: string, search?: string) {
    return this.prisma.supplier.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { gstin: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplier(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        purchaseInvoices: {
          take: 10,
          orderBy: { billDate: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async createSupplier(organizationId: string, input: CreateSupplierInput) {
    return this.prisma.supplier.create({
      data: {
        organizationId,
        name: input.name,
        companyName: input.companyName || null,
        email: input.email || null,
        phone: input.phone || null,
        gstin: input.gstin || null,
        partyType: input.partyType,
        state: input.state,
        stateCode: input.stateCode,
        billingAddress: input.billingAddress,
      },
    });
  }
}
