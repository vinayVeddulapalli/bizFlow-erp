import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeadInput, AddLeadActivityInput } from '@bizflow/validation';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeads(organizationId: string, status?: LeadStatus, search?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    return leads.map((l) => ({
      ...l,
      estimatedValue: l.estimatedValue.toString(),
    }));
  }

  async getLeadById(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }

    return {
      ...lead,
      estimatedValue: lead.estimatedValue.toString(),
    };
  }

  async createLead(organizationId: string, data: CreateLeadInput) {
    return this.prisma.lead.create({
      data: {
        organizationId,
        name: data.name,
        companyName: data.companyName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        source: data.source || undefined,
        status: data.status as any || 'NEW',
        estimatedValue: data.estimatedValue || 0,
        notes: data.notes || undefined,
      },
    });
  }

  async updateStatus(organizationId: string, id: string, status: LeadStatus, notes?: string) {
    await this.getLeadById(organizationId, id);

    return this.prisma.lead.update({
      where: { id },
      data: {
        status,
        ...(notes ? { notes } : {}),
      },
    });
  }

  async convertToCustomer(organizationId: string, id: string) {
    const lead = await this.getLeadById(organizationId, id);

    if (lead.convertedToCustomerId) {
      throw new BadRequestException('Lead has already been converted to a customer.');
    }

    // Create Customer
    const customer = await this.prisma.customer.create({
      data: {
        organizationId,
        name: lead.name,
        companyName: lead.companyName || undefined,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        partyType: 'REGULAR',
        state: 'Maharashtra',
        stateCode: '27',
        billingAddress: 'Address provided during CRM lead qualification',
        currentBalance: 0,
      },
    });

    // Mark Lead as WON and store customer ID
    await this.prisma.lead.update({
      where: { id },
      data: {
        status: 'WON',
        convertedToCustomerId: customer.id,
      },
    });

    return customer;
  }

  async addActivity(organizationId: string, leadId: string, data: AddLeadActivityInput) {
    await this.getLeadById(organizationId, leadId);

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        activityType: data.activityType,
        summary: data.summary,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      },
    });
  }
}
