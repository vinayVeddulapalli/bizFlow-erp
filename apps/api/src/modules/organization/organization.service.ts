import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrganizationInput } from '@bizflow/validation';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(userId: string, input: CreateOrganizationInput) {
    let superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'SuperAdmin', isSystem: true },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: 'SuperAdmin',
          description: 'Full administrative control over all tenant modules',
          isSystem: true,
          permissions: ['*'],
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          legalName: input.legalName,
          gstin: input.gstin || null,
          pan: input.pan || null,
          currencyCode: input.currencyCode,
          fiscalYearStartMonth: input.fiscalYearStartMonth,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: input.branchName,
          code: 'BR-01',
          gstin: input.gstin || null,
          addressLine1: `${input.city} Office`,
          city: input.city,
          state: input.state,
          stateCode: input.stateCode,
          postalCode: input.postalCode,
          isMainBranch: true,
        },
      });

      await tx.warehouse.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          name: `${input.branchName} Warehouse`,
          code: 'WH-01',
          isDefault: true,
        },
      });

      // Clear existing default flags for this user
      await tx.organizationMember.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      const membership = await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          roleId: superAdminRole!.id,
          isDefault: true,
        },
        include: {
          organization: true,
          role: true,
        },
      });

      return {
        organization: org,
        branch,
        membership,
      };
    });
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                branches: true,
                members: true,
              },
            },
          },
        },
        role: true,
      },
      orderBy: { isDefault: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      legalName: m.organization.legalName,
      gstin: m.organization.gstin,
      currencyCode: m.organization.currencyCode,
      role: m.role.name,
      isDefault: m.isDefault,
      branchCount: m.organization._count.branches,
      memberCount: m.organization._count.members,
      joinedAt: m.joinedAt,
    }));
  }

  async getOrganization(orgId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      include: {
        organization: {
          include: {
            branches: true,
            warehouses: true,
          },
        },
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return {
      organization: membership.organization,
      userRole: membership.role.name,
      permissions: membership.role.permissions,
    };
  }

  async switchOrganization(userId: string, targetOrgId: string) {
    const targetMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId,
        },
      },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!targetMembership) {
      throw new ForbiddenException('You do not belong to the target organization');
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.organizationMember.update({
        where: { id: targetMembership.id },
        data: { isDefault: true },
      }),
    ]);

    return {
      activeOrganizationId: targetOrgId,
      organizationName: targetMembership.organization.name,
      role: targetMembership.role.name,
      permissions: targetMembership.role.permissions,
    };
  }

  async getInvoiceTemplateConfig(organizationId: string) {
    let config = await this.prisma.invoiceTemplateConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      config = await this.prisma.invoiceTemplateConfig.create({
        data: {
          organizationId,
          templateTheme: 'MODERN_TEAL',
          paperSize: 'A4',
          showLogo: true,
          showSignature: true,
          showQrCode: true,
          headerColor: '#0d9488',
          customTerms: '1. Goods once sold will not be taken back without original invoice.\n2. Interest @ 18% p.a. will be charged on overdue payments beyond credit period.',
          invoicePrefix: 'INV',
          customField1Title: 'PO Reference #',
          customField2Title: 'Vehicle / Transporter ID',
        },
      });
    }

    return config;
  }

  async updateInvoiceTemplateConfig(organizationId: string, input: any) {
    return this.prisma.invoiceTemplateConfig.upsert({
      where: { organizationId },
      update: {
        templateTheme: input.templateTheme,
        paperSize: input.paperSize,
        showLogo: input.showLogo,
        showSignature: input.showSignature,
        showQrCode: input.showQrCode,
        headerColor: input.headerColor,
        customTerms: input.customTerms,
        invoicePrefix: input.invoicePrefix,
        customField1Title: input.customField1Title,
        customField2Title: input.customField2Title,
      },
      create: {
        organizationId,
        templateTheme: input.templateTheme || 'MODERN_TEAL',
        paperSize: input.paperSize || 'A4',
        showLogo: input.showLogo ?? true,
        showSignature: input.showSignature ?? true,
        showQrCode: input.showQrCode ?? true,
        headerColor: input.headerColor || '#0d9488',
        customTerms: input.customTerms,
        invoicePrefix: input.invoicePrefix || 'INV',
        customField1Title: input.customField1Title,
        customField2Title: input.customField2Title,
      },
    });
  }
}
