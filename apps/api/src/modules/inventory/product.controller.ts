import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createProductSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Inventory & Products')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('inventory/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List products with current stock levels across warehouses' })
  async listProducts(
    @ActiveTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStockOnly') lowStockOnly?: string
  ) {
    return this.productService.listProducts(
      tenant.organizationId,
      search,
      categoryId,
      lowStockOnly === 'true'
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details, warehouse allocations, and movement history' })
  async getProduct(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.productService.getProduct(tenant.organizationId, id);
  }

  @Post()
  @RequirePermissions('inventory.create', 'products.manage')
  @ApiOperation({ summary: 'Create new product or service master with optional opening stock' })
  async createProduct(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createProductSchema.parse(body);
    return this.productService.createProduct(tenant.organizationId, validated);
  }

  @Patch(':id')
  @RequirePermissions('inventory.edit', 'products.manage')
  @ApiOperation({ summary: 'Update product master details' })
  async updateProduct(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.productService.updateProduct(tenant.organizationId, id, body);
  }
}
