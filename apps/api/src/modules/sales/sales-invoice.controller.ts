import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SalesInvoiceService } from './sales-invoice.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createSalesInvoiceSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Sales & Invoicing')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('sales/invoices')
export class SalesInvoiceController {
  constructor(private readonly salesInvoiceService: SalesInvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List sales invoices with optional filters' })
  async listInvoices(
    @ActiveTenant() tenant: TenantContext,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string
  ) {
    return this.salesInvoiceService.listInvoices(tenant.organizationId, status, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed sales invoice' })
  async getInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.salesInvoiceService.getInvoice(tenant.organizationId, id);
  }

  @Post()
  @RequirePermissions('sales.create', 'sales.manage')
  @ApiOperation({ summary: 'Create draft sales invoice with live GST calculation' })
  async createInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createSalesInvoiceSchema.parse(body);
    return this.salesInvoiceService.createInvoice(tenant.organizationId, validated);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sales.post', 'sales.manage')
  @ApiOperation({ summary: 'Finalize and post sales invoice (assigns official sequential number)' })
  async postInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.salesInvoiceService.postInvoice(tenant.organizationId, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sales.cancel', 'sales.manage')
  @ApiOperation({ summary: 'Cancel posted sales invoice' })
  async cancelInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.salesInvoiceService.cancelInvoice(tenant.organizationId, id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download or view printable tax invoice' })
  async getInvoicePdf(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const html = await this.salesInvoiceService.getInvoiceHtml(tenant.organizationId, id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
