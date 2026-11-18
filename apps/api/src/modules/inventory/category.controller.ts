import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createCategorySchema, createUomSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Inventory & Classifications')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('inventory')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List hierarchical product categories' })
  async listCategories(@ActiveTenant() tenant: TenantContext) {
    return this.categoryService.listCategories(tenant.organizationId);
  }

  @Post('categories')
  @RequirePermissions('inventory.create', 'products.manage')
  @ApiOperation({ summary: 'Create new product category' })
  async createCategory(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createCategorySchema.parse(body);
    return this.categoryService.createCategory(tenant.organizationId, validated);
  }

  @Get('uoms')
  @ApiOperation({ summary: 'List Units of Measurement (GST UQC standards)' })
  async listUoms(@ActiveTenant() tenant: TenantContext) {
    return this.categoryService.listUoms(tenant.organizationId);
  }

  @Post('uoms')
  @RequirePermissions('inventory.create', 'products.manage')
  @ApiOperation({ summary: 'Create new Unit of Measurement' })
  async createUom(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createUomSchema.parse(body);
    return this.categoryService.createUom(tenant.organizationId, validated);
  }
}
