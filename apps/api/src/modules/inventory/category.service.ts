import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryInput, CreateUomInput } from '@bizflow/validation';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(organizationId: string) {
    return this.prisma.productCategory.findMany({
      where: { organizationId },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(organizationId: string, input: CreateCategoryInput) {
    return this.prisma.productCategory.create({
      data: {
        organizationId,
        name: input.name,
        parentId: input.parentId || null,
      },
    });
  }

  async listUoms(organizationId: string) {
    let uoms = await this.prisma.unitOfMeasurement.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });

    // Seed default standard GST UQC units if empty
    if (uoms.length === 0) {
      const defaults = [
        { name: 'Pieces', code: 'PCS' },
        { name: 'Kilograms', code: 'KGS' },
        { name: 'Boxes', code: 'BOX' },
        { name: 'Meters', code: 'MTR' },
        { name: 'Liters', code: 'LTR' },
        { name: 'Numbers', code: 'NOS' },
      ];

      for (const d of defaults) {
        await this.prisma.unitOfMeasurement.create({
          data: { organizationId, name: d.name, code: d.code },
        });
      }

      uoms = await this.prisma.unitOfMeasurement.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
      });
    }

    return uoms;
  }

  async createUom(organizationId: string, input: CreateUomInput) {
    return this.prisma.unitOfMeasurement.create({
      data: {
        organizationId,
        name: input.name,
        code: input.code,
      },
    });
  }
}
