import { z } from 'zod';

export const createProductSchema = z.object({
  type: z.enum(['GOODS', 'SERVICE']).default('GOODS'),
  name: z.string().min(2, { message: 'Product name is required' }).max(150),
  sku: z.string().max(50).optional().or(z.literal('')),
  barcode: z.string().max(50).optional().or(z.literal('')),
  hsnSacCode: z.string().max(10).optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().nullable().or(z.literal('')),
  uomId: z.string().uuid().optional().nullable().or(z.literal('')),
  sellingPrice: z.number().min(0, { message: 'Selling price cannot be negative' }).default(0),
  purchasePrice: z.number().min(0, { message: 'Purchase cost cannot be negative' }).default(0),
  taxRate: z.number().min(0).max(100).default(18),
  isTaxInclusive: z.boolean().default(false),
  minStockLevel: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  // Optional opening stock
  openingStock: z.number().min(0).optional(),
  openingWarehouseId: z.string().uuid().optional().or(z.literal('')),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(2, { message: 'Category name is required' }).max(100),
  parentId: z.string().uuid().optional().nullable().or(z.literal('')),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createUomSchema = z.object({
  name: z.string().min(2).max(50),
  code: z.string().min(1).max(10).toUpperCase(),
});

export type CreateUomInput = z.infer<typeof createUomSchema>;

export const createWarehouseTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid({ message: 'Source warehouse required' }),
  targetWarehouseId: z.string().uuid({ message: 'Target warehouse required' }),
  transferDate: z.string().min(10, { message: 'Valid date required' }),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive({ message: 'Quantity must be positive' }),
      })
    )
    .min(1, { message: 'At least one item required' }),
});

export type CreateWarehouseTransferInput = z.infer<typeof createWarehouseTransferSchema>;

export const createStockAdjustmentSchema = z.object({
  warehouseId: z.string().uuid({ message: 'Warehouse selection required' }),
  adjustmentDate: z.string().min(10, { message: 'Valid date required' }),
  reason: z.string().min(2, { message: 'Reason required (e.g. Shrinkage, Physical Count)' }),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number(), // positive to increase, negative to decrease
        unitCost: z.number().min(0).default(0),
      })
    )
    .min(1, { message: 'At least one item required' }),
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
