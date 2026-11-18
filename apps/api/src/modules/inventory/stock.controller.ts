import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import {
  createWarehouseTransferSchema,
  createStockAdjustmentSchema,
} from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Inventory & Stock Management')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('inventory')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('stock-levels')
  @ApiOperation({ summary: 'Get current stock balance per warehouse' })
  async getStockLevels(
    @ActiveTenant() tenant: TenantContext,
    @Query('warehouseId') warehouseId?: string
  ) {
    return this.stockService.getStockLevels(tenant.organizationId, warehouseId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get immutable stock ledger movements (IN/OUT audit log)' })
  async getStockMovements(
    @ActiveTenant() tenant: TenantContext,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string
  ) {
    return this.stockService.getStockMovements(
      tenant.organizationId,
      productId,
      warehouseId
    );
  }

  @Post('transfers')
  @RequirePermissions('inventory.transfer', 'inventory.manage')
  @ApiOperation({ summary: 'Execute stock transfer between two warehouses' })
  async transferStock(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createWarehouseTransferSchema.parse(body);
    return this.stockService.transferStock(tenant.organizationId, validated);
  }

  @Post('adjustments')
  @RequirePermissions('inventory.adjust', 'inventory.manage')
  @ApiOperation({ summary: 'Execute physical stock adjustment' })
  async adjustStock(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createStockAdjustmentSchema.parse(body);
    return this.stockService.adjustStock(tenant.organizationId, validated);
  }
}
