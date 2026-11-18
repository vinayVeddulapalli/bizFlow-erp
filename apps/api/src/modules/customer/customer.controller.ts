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
import { CustomerService } from './customer.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createCustomerSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Sales & Customers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('sales/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers for the active organization' })
  async listCustomers(
    @ActiveTenant() tenant: TenantContext,
    @Query('search') search?: string
  ) {
    return this.customerService.listCustomers(tenant.organizationId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details, recent invoices, and balance' })
  async getCustomer(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.customerService.getCustomer(tenant.organizationId, id);
  }

  @Post()
  @RequirePermissions('customers.create', 'sales.manage')
  @ApiOperation({ summary: 'Create a new customer master record' })
  async createCustomer(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createCustomerSchema.parse(body);
    return this.customerService.createCustomer(tenant.organizationId, validated);
  }

  @Patch(':id')
  @RequirePermissions('customers.edit', 'sales.manage')
  @ApiOperation({ summary: 'Update customer details' })
  async updateCustomer(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.customerService.updateCustomer(tenant.organizationId, id, body);
  }
}
