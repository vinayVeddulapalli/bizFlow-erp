import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentSequenceService } from '../../common/sequence/sequence.service';
import {
  CreateWarehouseTransferInput,
  CreateStockAdjustmentInput,
} from '@bizflow/validation';
import { toDecimal, Decimal } from '@bizflow/shared-utils';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: DocumentSequenceService
  ) {}

  async getStockLevels(organizationId: string, warehouseId?: string) {
    return this.prisma.stockLevel.findMany({
      where: {
        organizationId,
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true, sellingPrice: true, purchasePrice: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getStockMovements(organizationId: string, productId?: string, warehouseId?: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  async transferStock(organizationId: string, input: CreateWarehouseTransferInput) {
    if (input.sourceWarehouseId === input.targetWarehouseId) {
      throw new BadRequestException('Source and target warehouses must be different');
    }

    const transferNumber = await this.sequenceService.getNextNumber(
      organizationId,
      'SALES_INVOICE',
      'TRF'
    );

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.warehouseTransfer.create({
        data: {
          organizationId,
          transferNumber,
          sourceWarehouseId: input.sourceWarehouseId,
          targetWarehouseId: input.targetWarehouseId,
          transferDate: new Date(input.transferDate),
          status: 'COMPLETED',
          notes: input.notes || null,
          items: {
            create: input.items.map((it) => ({
              productId: it.productId,
              quantity: toDecimal(it.quantity).toString(),
            })),
          },
        },
      });

      for (const it of input.items) {
        const qty = toDecimal(it.quantity);

        // 1. Decrement Source Warehouse Stock
        await tx.stockLevel.upsert({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: it.productId,
              warehouseId: input.sourceWarehouseId,
            },
          },
          update: {
            quantity: { decrement: qty.toNumber() },
          },
          create: {
            organizationId,
            productId: it.productId,
            warehouseId: input.sourceWarehouseId,
            quantity: new Decimal(0).minus(qty).toString(),
          },
        });

        // 2. Increment Target Warehouse Stock
        await tx.stockLevel.upsert({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: it.productId,
              warehouseId: input.targetWarehouseId,
            },
          },
          update: {
            quantity: { increment: qty.toNumber() },
          },
          create: {
            organizationId,
            productId: it.productId,
            warehouseId: input.targetWarehouseId,
            quantity: qty.toString(),
          },
        });

        // 3. Log Dual Stock Movements
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: it.productId,
            warehouseId: input.sourceWarehouseId,
            movementType: 'TRANSFER_OUT',
            quantity: new Decimal(0).minus(qty).toString(),
            unitCost: '0.00',
            referenceType: 'warehouse_transfer',
            referenceId: transfer.id,
            notes: `Transfer to ${transferNumber}`,
          },
        });

        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: it.productId,
            warehouseId: input.targetWarehouseId,
            movementType: 'TRANSFER_IN',
            quantity: qty.toString(),
            unitCost: '0.00',
            referenceType: 'warehouse_transfer',
            referenceId: transfer.id,
            notes: `Transfer from ${transferNumber}`,
          },
        });
      }

      return transfer;
    });
  }

  async adjustStock(organizationId: string, input: CreateStockAdjustmentInput) {
    const adjustmentNo = await this.sequenceService.getNextNumber(
      organizationId,
      'SALES_INVOICE',
      'ADJ'
    );

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          organizationId,
          warehouseId: input.warehouseId,
          adjustmentNo,
          adjustmentDate: new Date(input.adjustmentDate),
          reason: input.reason,
          notes: input.notes || null,
          items: {
            create: input.items.map((it) => ({
              productId: it.productId,
              quantity: toDecimal(it.quantity).toString(),
              unitCost: toDecimal(it.unitCost).toString(),
            })),
          },
        },
      });

      for (const it of input.items) {
        const qty = toDecimal(it.quantity);

        await tx.stockLevel.upsert({
          where: {
            organizationId_productId_warehouseId: {
              organizationId,
              productId: it.productId,
              warehouseId: input.warehouseId,
            },
          },
          update: {
            quantity: { increment: qty.toNumber() },
          },
          create: {
            organizationId,
            productId: it.productId,
            warehouseId: input.warehouseId,
            quantity: qty.toString(),
          },
        });

        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: it.productId,
            warehouseId: input.warehouseId,
            movementType: 'STOCK_ADJUSTMENT',
            quantity: qty.toString(),
            unitCost: toDecimal(it.unitCost).toString(),
            referenceType: 'stock_adjustment',
            referenceId: adjustment.id,
            notes: `${input.reason} (${adjustmentNo})`,
          },
        });
      }

      return adjustment;
    });
  }
}
