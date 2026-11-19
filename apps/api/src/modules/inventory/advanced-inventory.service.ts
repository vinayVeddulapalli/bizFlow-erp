import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateBatchDto {
  productId: string;
  warehouseId?: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate?: string;
  mrp: number;
  purchasePrice: number;
  salePrice: number;
  currentStock?: number;
}

export interface CreateSerialDto {
  productId: string;
  warehouseId?: string;
  serialNumber: string;
  warrantyExpiry?: string;
}

export interface UpsertConversionDto {
  productId: string;
  primaryUnitId: string;
  secondaryUnitId: string;
  conversionRatio: number;
}

export interface UpsertPartyPriceDto {
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: string;
  productId: string;
  specialPrice: number;
  minOrderQty?: number;
  discountPct?: number;
}

@Injectable()
export class AdvancedInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // BATCH MANAGEMENT & EXPIRY
  // -------------------------------------------------------------
  async listBatches(
    organizationId: string,
    productId?: string,
    warehouseId?: string
  ) {
    const batches = await this.prisma.productBatch.findMany({
      where: {
        organizationId,
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      orderBy: { expiryDate: 'asc' },
    });

    const productIds = [...new Set(batches.map((b) => b.productId))];
    const warehouseIds = [...new Set(batches.map((b) => b.warehouseId))];

    const [products, warehouses] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      }),
      this.prisma.warehouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const prodMap = new Map(products.map((p) => [p.id, p]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

    return batches.map((b) => {
      const isExpired = b.expiryDate ? new Date(b.expiryDate) < now : false;
      const isExpiringSoon =
        b.expiryDate && !isExpired
          ? new Date(b.expiryDate) <= thirtyDaysFromNow
          : false;

      return {
        ...b,
        product: prodMap.get(b.productId) || null,
        warehouse: whMap.get(b.warehouseId) || null,
        isExpired,
        isExpiringSoon,
      };
    });
  }

  async createBatch(organizationId: string, dto: CreateBatchDto) {
    let warehouseId = dto.warehouseId;
    if (!warehouseId) {
      const defWh = await this.prisma.warehouse.findFirst({
        where: { organizationId, isDefault: true },
      });
      if (!defWh) {
        throw new NotFoundException('No default warehouse found.');
      }
      warehouseId = defWh.id;
    }

    const existing = await this.prisma.productBatch.findUnique({
      where: {
        organizationId_productId_batchNumber_warehouseId: {
          organizationId,
          productId: dto.productId,
          batchNumber: dto.batchNumber.trim().toUpperCase(),
          warehouseId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Batch ${dto.batchNumber} already exists for this product in this warehouse.`
      );
    }

    return this.prisma.productBatch.create({
      data: {
        organizationId,
        productId: dto.productId,
        warehouseId,
        batchNumber: dto.batchNumber.trim().toUpperCase(),
        mfgDate: dto.mfgDate ? new Date(dto.mfgDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        mrp: dto.mrp,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        currentStock: dto.currentStock || 0,
      },
    });
  }

  // -------------------------------------------------------------
  // SERIAL NUMBERS
  // -------------------------------------------------------------
  async listSerials(
    organizationId: string,
    productId?: string,
    status?: string
  ) {
    const serials = await this.prisma.productSerial.findMany({
      where: {
        organizationId,
        ...(productId ? { productId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const productIds = [...new Set(serials.map((s) => s.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    const prodMap = new Map(products.map((p) => [p.id, p]));

    return serials.map((s) => ({
      ...s,
      product: prodMap.get(s.productId) || null,
    }));
  }

  async createSerial(organizationId: string, dto: CreateSerialDto) {
    let warehouseId = dto.warehouseId;
    if (!warehouseId) {
      const defWh = await this.prisma.warehouse.findFirst({
        where: { organizationId, isDefault: true },
      });
      if (!defWh) {
        throw new NotFoundException('No default warehouse found.');
      }
      warehouseId = defWh.id;
    }

    const existing = await this.prisma.productSerial.findUnique({
      where: {
        organizationId_productId_serialNumber: {
          organizationId,
          productId: dto.productId,
          serialNumber: dto.serialNumber.trim().toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Serial number ${dto.serialNumber} already registered for this product.`
      );
    }

    return this.prisma.productSerial.create({
      data: {
        organizationId,
        productId: dto.productId,
        warehouseId,
        serialNumber: dto.serialNumber.trim().toUpperCase(),
        status: 'IN_STOCK',
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
      },
    });
  }

  // -------------------------------------------------------------
  // UNIT CONVERSIONS (PRIMARY & SECONDARY UNITS)
  // -------------------------------------------------------------
  async listUnitConversions(organizationId: string) {
    const convs = await this.prisma.unitConversion.findMany({
      where: { organizationId },
    });

    const productIds = [...new Set(convs.map((c) => c.productId))];
    const unitIds = [
      ...new Set([
        ...convs.map((c) => c.primaryUnitId),
        ...convs.map((c) => c.secondaryUnitId),
      ]),
    ];

    const [products, units] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      }),
      this.prisma.unitOfMeasurement.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const prodMap = new Map(products.map((p) => [p.id, p]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    return convs.map((c) => ({
      ...c,
      product: prodMap.get(c.productId) || null,
      primaryUnit: unitMap.get(c.primaryUnitId) || null,
      secondaryUnit: unitMap.get(c.secondaryUnitId) || null,
    }));
  }

  async upsertUnitConversion(organizationId: string, dto: UpsertConversionDto) {
    return this.prisma.unitConversion.upsert({
      where: {
        organizationId_productId: {
          organizationId,
          productId: dto.productId,
        },
      },
      update: {
        primaryUnitId: dto.primaryUnitId,
        secondaryUnitId: dto.secondaryUnitId,
        conversionRatio: dto.conversionRatio,
      },
      create: {
        organizationId,
        productId: dto.productId,
        primaryUnitId: dto.primaryUnitId,
        secondaryUnitId: dto.secondaryUnitId,
        conversionRatio: dto.conversionRatio,
      },
    });
  }

  // -------------------------------------------------------------
  // PARTY PRICE MATRIX
  // -------------------------------------------------------------
  async listPartyPrices(organizationId: string, partyId?: string) {
    const prices = await this.prisma.partyPriceMatrix.findMany({
      where: {
        organizationId,
        ...(partyId ? { partyId } : {}),
      },
    });

    const productIds = [...new Set(prices.map((p) => p.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, sellingPrice: true },
    });
    const prodMap = new Map(products.map((p) => [p.id, p]));

    return prices.map((p) => ({
      ...p,
      product: prodMap.get(p.productId) || null,
    }));
  }

  async upsertPartyPrice(organizationId: string, dto: UpsertPartyPriceDto) {
    return this.prisma.partyPriceMatrix.upsert({
      where: {
        organizationId_partyId_productId: {
          organizationId,
          partyId: dto.partyId,
          productId: dto.productId,
        },
      },
      update: {
        partyType: dto.partyType,
        specialPrice: dto.specialPrice,
        minOrderQty: dto.minOrderQty || null,
        discountPct: dto.discountPct || null,
      },
      create: {
        organizationId,
        partyType: dto.partyType,
        partyId: dto.partyId,
        productId: dto.productId,
        specialPrice: dto.specialPrice,
        minOrderQty: dto.minOrderQty || null,
        discountPct: dto.discountPct || null,
      },
    });
  }
}
