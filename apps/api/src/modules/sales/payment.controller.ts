import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { recordPaymentReceiptSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Sales & Payments')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('sales/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({ summary: 'List customer payment receipts' })
  async listPayments(
    @ActiveTenant() tenant: TenantContext,
    @Query('customerId') customerId?: string
  ) {
    return this.paymentService.listPayments(tenant.organizationId, customerId);
  }

  @Post()
  @RequirePermissions('payments.create', 'sales.manage')
  @ApiOperation({ summary: 'Record customer payment receipt and allocate to invoices' })
  async recordPayment(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = recordPaymentReceiptSchema.parse(body);
    return this.paymentService.recordPayment(tenant.organizationId, validated);
  }
}
