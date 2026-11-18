export type ItemType = 'GOODS' | 'SERVICE';
export type MovementType =
  | 'SALES_INVOICE'
  | 'SALES_RETURN'
  | 'PURCHASE_RECEIPT'
  | 'PURCHASE_RETURN'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'STOCK_ADJUSTMENT'
  | 'OPENING_STOCK';

export interface ProductCategoryDto {
  id: string;
  organizationId: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
}

export interface UnitOfMeasurementDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
}

export interface StockLevelDto {
  id: string;
  organizationId: string;
  productId: string;
  warehouseId: string;
  warehouseName?: string;
  quantity: string;
  updatedAt: string;
}

export interface ProductDto {
  id: string;
  organizationId: string;
  type: ItemType;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  hsnSacCode?: string | null;
  categoryId?: string | null;
  categoryName?: string;
  uomId?: string | null;
  uomCode?: string;
  sellingPrice: string;
  purchasePrice: string;
  taxRate: string;
  isTaxInclusive: boolean;
  minStockLevel: string;
  reorderPoint: string;
  currentStock?: string;
  isActive: boolean;
  stockLevels?: StockLevelDto[];
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  organizationId: string;
  productId: string;
  productName?: string;
  warehouseId: string;
  warehouseName?: string;
  movementType: MovementType;
  quantity: string;
  unitCost: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface WarehouseTransferDto {
  id: string;
  organizationId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName?: string;
  targetWarehouseId: string;
  targetWarehouseName?: string;
  transferDate: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface StockAdjustmentDto {
  id: string;
  organizationId: string;
  warehouseId: string;
  warehouseName?: string;
  adjustmentNo: string;
  adjustmentDate: string;
  reason: string;
  notes?: string | null;
  createdAt: string;
}
