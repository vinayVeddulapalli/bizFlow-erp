import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomerInput } from '@bizflow/validation';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(organizationId: string, search?: string) {
    return this.prisma.customer.findMany({
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

  async getCustomer(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        salesInvoices: {
          take: 10,
          orderBy: { invoiceDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            totalAmount: true,
            dueAmount: true,
            status: true,
          },
        },
        paymentReceipts: {
          take: 10,
          orderBy: { paymentDate: 'desc' },
          select: {
            id: true,
            receiptNumber: true,
            paymentDate: true,
            paymentMode: true,
            amount: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async createCustomer(organizationId: string, input: CreateCustomerInput) {
    return this.prisma.customer.create({
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
        shippingAddress: input.shippingAddress || null,
        creditLimit: toDecimal(input.creditLimit).toString(),
      },
    });
  }

  async updateCustomer(organizationId: string, id: string, input: Partial<CreateCustomerInput>) {
    await this.getCustomer(organizationId, id);

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.companyName !== undefined && { companyName: input.companyName || null }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.phone !== undefined && { phone: input.phone || null }),
        ...(input.gstin !== undefined && { gstin: input.gstin || null }),
        ...(input.partyType && { partyType: input.partyType }),
        ...(input.state && { state: input.state }),
        ...(input.stateCode && { stateCode: input.stateCode }),
        ...(input.billingAddress && { billingAddress: input.billingAddress }),
        ...(input.shippingAddress !== undefined && { shippingAddress: input.shippingAddress || null }),
        ...(input.creditLimit !== undefined && { creditLimit: toDecimal(input.creditLimit).toString() }),
      },
    });
  }
}
