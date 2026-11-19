import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StoreService, CreateStoreOrderDto } from './store.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Online Store & E-Commerce')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // Public E-Commerce storefront endpoint
  @Public()
  @Get('public/:orgId/catalog')
  @ApiOperation({ summary: 'Public catalog of products for online ordering' })
  async getPublicCatalog(@Param('orgId') orgId: string) {
    return this.storeService.getPublicStoreInfo(orgId);
  }

  // Public customer order placement
  @Public()
  @Post('public/:orgId/order')
  @ApiOperation({ summary: 'Public order placement by online customers' })
  async placePublicOrder(
    @Param('orgId') orgId: string,
    @Body() dto: CreateStoreOrderDto,
  ) {
    return this.storeService.placeOnlineOrder(orgId, dto);
  }

  // Merchant back-office endpoints
  @Get('orders')
  @ApiOperation({ summary: 'List all online orders for current organization' })
  async listOrders(@Req() req: any) {
    return this.storeService.listStoreOrders(req.organizationId);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update status of an online order' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.storeService.updateOrderStatus(req.organizationId, id, body.status);
  }

  @Post('orders/:id/convert')
  @ApiOperation({ summary: 'Convert online order into a formal Sales Invoice' })
  async convertToInvoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body?: { branchId?: string },
  ) {
    return this.storeService.convertOrderToInvoice(
      req.organizationId,
      id,
      body?.branchId,
    );
  }
}
