import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PurchaseBillService } from './purchase-bill.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createPurchaseInvoiceSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Purchases & Bills')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('purchases/bills')
export class PurchaseBillController {
  constructor(private readonly purchaseBillService: PurchaseBillService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase bills with optional filters' })
  async listBills(
    @ActiveTenant() tenant: TenantContext,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string
  ) {
    return this.purchaseBillService.listBills(tenant.organizationId, supplierId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase bill details' })
  async getBill(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.purchaseBillService.getBill(tenant.organizationId, id);
  }

  @Post()
  @RequirePermissions('purchases.create', 'purchases.manage')
  @ApiOperation({ summary: 'Create draft purchase bill' })
  async createBill(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createPurchaseInvoiceSchema.parse(body);
    return this.purchaseBillService.createBill(tenant.organizationId, validated);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('purchases.post', 'purchases.manage')
  @ApiOperation({ summary: 'Finalize and post purchase bill' })
  async postBill(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.purchaseBillService.postBill(tenant.organizationId, id);
  }
}
