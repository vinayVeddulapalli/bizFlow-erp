import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createSupplierSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Purchases & Suppliers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('purchases/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @ApiOperation({ summary: 'List all suppliers/vendors' })
  async listSuppliers(
    @ActiveTenant() tenant: TenantContext,
    @Query('search') search?: string
  ) {
    return this.supplierService.listSuppliers(tenant.organizationId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details and recent bills' })
  async getSupplier(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.supplierService.getSupplier(tenant.organizationId, id);
  }

  @Post()
  @RequirePermissions('suppliers.create', 'purchases.manage')
  @ApiOperation({ summary: 'Create new supplier master' })
  async createSupplier(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createSupplierSchema.parse(body);
    return this.supplierService.createSupplier(tenant.organizationId, validated);
  }
}
