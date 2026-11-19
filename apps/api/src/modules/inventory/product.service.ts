import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductInput } from '@bizflow/validation';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(
    organizationId: string,
    search?: string,
    categoryId?: string,
    lowStockOnly?: boolean
  ) {
    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        uom: { select: { id: true, name: true, code: true } },
        stockLevels: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = products.map((p) => {
      const currentStock = p.stockLevels.reduce(
        (acc, sl) => acc.plus(toDecimal(sl.quantity.toString())),
        toDecimal(0)
      );

      return {
        id: p.id,
        organizationId: p.organizationId,
        type: p.type,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        hsnSacCode: p.hsnSacCode,
        categoryId: p.categoryId,
        categoryName: p.category?.name,
        uomId: p.uomId,
        uomCode: p.uom?.code,
        sellingPrice: p.sellingPrice.toString(),
        salePrice: p.sellingPrice.toString(),
        purchasePrice: p.purchasePrice.toString(),
        taxRate: p.taxRate.toString(),
        isTaxInclusive: p.isTaxInclusive,
        minStockLevel: p.minStockLevel.toString(),
        reorderPoint: p.reorderPoint.toString(),
        currentStock: currentStock.toString(),
        totalStock: currentStock.toString(),
        isLowStock: toDecimal(currentStock).lte(toDecimal(p.minStockLevel.toString())),
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        uom: p.uom ? { id: p.uom.id, name: p.uom.name, symbol: p.uom.code, code: p.uom.code } : null,
        isActive: p.isActive,
        stockLevels: p.stockLevels.map((sl) => ({
          id: sl.id,
          organizationId: sl.organizationId,
          productId: sl.productId,
          warehouseId: sl.warehouseId,
          warehouseName: sl.warehouse.name,
          quantity: sl.quantity.toString(),
          updatedAt: sl.updatedAt.toISOString(),
        })),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    if (lowStockOnly) {
      return mapped.filter((p) =>
        toDecimal(p.currentStock).lte(toDecimal(p.minStockLevel))
      );
    }

    return mapped;
  }

  async getProduct(organizationId: string, id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        uom: true,
        stockLevels: {
          include: { warehouse: true },
        },
        stockMovements: {
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: { warehouse: { select: { name: true } } },
        },
      },
    });

    if (!p) {
      throw new NotFoundException('Product not found');
    }

    const currentStock = p.stockLevels.reduce(
      (acc, sl) => acc.plus(toDecimal(sl.quantity.toString())),
      toDecimal(0)
    );

    return {
      ...p,
      salePrice: p.sellingPrice.toString(),
      currentStock: currentStock.toString(),
      totalStock: currentStock.toString(),
    };
  }

  async createProduct(organizationId: string, input: CreateProductInput) {
    if (input.sku) {
      const existing = await this.prisma.product.findUnique({
        where: {
          organizationId_sku: {
            organizationId,
            sku: input.sku,
          },
        },
      });
      if (existing) {
        throw new ConflictException(`SKU "${input.sku}" already exists`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          organizationId,
          type: input.type,
          name: input.name,
          sku: input.sku || null,
          barcode: input.barcode || null,
          hsnSacCode: input.hsnSacCode || null,
          categoryId: input.categoryId || null,
          uomId: input.uomId || null,
          sellingPrice: toDecimal(input.sellingPrice).toString(),
          purchasePrice: toDecimal(input.purchasePrice).toString(),
          taxRate: toDecimal(input.taxRate).toString(),
          isTaxInclusive: input.isTaxInclusive,
          minStockLevel: toDecimal(input.minStockLevel).toString(),
          reorderPoint: toDecimal(input.reorderPoint).toString(),
        },
      });

      // Handle opening stock if provided
      if (input.openingStock && input.openingStock > 0) {
        let warehouseId = input.openingWarehouseId;
        if (!warehouseId) {
          const defaultWh = await tx.warehouse.findFirst({
            where: { organizationId, isDefault: true },
          });
          warehouseId = defaultWh?.id;
        }

        if (warehouseId) {
          const openingQty = toDecimal(input.openingStock);
          await tx.stockLevel.upsert({
            where: {
              organizationId_productId_warehouseId: {
                organizationId,
                productId: product.id,
                warehouseId,
              },
            },
            update: {
              quantity: { increment: openingQty.toNumber() },
            },
            create: {
              organizationId,
              productId: product.id,
              warehouseId,
              quantity: openingQty.toString(),
            },
          });

          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: product.id,
              warehouseId,
              movementType: 'OPENING_STOCK',
              quantity: openingQty.toString(),
              unitCost: toDecimal(input.purchasePrice).toString(),
              notes: 'Initial opening stock creation',
            },
          });
        }
      }

      return product;
    });
  }

  async updateProduct(organizationId: string, id: string, input: Partial<CreateProductInput>) {
    await this.getProduct(organizationId, id);

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku || null }),
        ...(input.barcode !== undefined && { barcode: input.barcode || null }),
        ...(input.hsnSacCode !== undefined && { hsnSacCode: input.hsnSacCode || null }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId || null }),
        ...(input.uomId !== undefined && { uomId: input.uomId || null }),
        ...(input.sellingPrice !== undefined && { sellingPrice: toDecimal(input.sellingPrice).toString() }),
        ...(input.purchasePrice !== undefined && { purchasePrice: toDecimal(input.purchasePrice).toString() }),
        ...(input.taxRate !== undefined && { taxRate: toDecimal(input.taxRate).toString() }),
        ...(input.isTaxInclusive !== undefined && { isTaxInclusive: input.isTaxInclusive }),
        ...(input.minStockLevel !== undefined && { minStockLevel: toDecimal(input.minStockLevel).toString() }),
        ...(input.reorderPoint !== undefined && { reorderPoint: toDecimal(input.reorderPoint).toString() }),
      },
    });
  }
}
