import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  OrdersService,
  CreateSalesOrderDto,
  CreatePurchaseOrderDto,
  CreateDeliveryChallanDto,
  CreateCreditNoteDto,
  CreateDebitNoteDto,
} from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.ordersService.getOverview(req.organizationId);
  }

  // --- Sales Orders ---
  @Get('sales')
  async listSalesOrders(@Req() req: any, @Query('status') status?: string) {
    return this.ordersService.listSalesOrders(req.organizationId, status);
  }

  @Post('sales')
  async createSalesOrder(@Req() req: any, @Body() body: CreateSalesOrderDto) {
    return this.ordersService.createSalesOrder(req.organizationId, body);
  }

  @Post('sales/:id/convert')
  async convertSalesOrder(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.convertSalesOrderToInvoice(req.organizationId, id);
  }

  // --- Purchase Orders ---
  @Get('purchases')
  async listPurchaseOrders(@Req() req: any, @Query('status') status?: string) {
    return this.ordersService.listPurchaseOrders(req.organizationId, status);
  }

  @Post('purchases')
  async createPurchaseOrder(
    @Req() req: any,
    @Body() body: CreatePurchaseOrderDto
  ) {
    return this.ordersService.createPurchaseOrder(req.organizationId, body);
  }

  // --- Delivery Challans ---
  @Get('challans')
  async listDeliveryChallans(@Req() req: any) {
    return this.ordersService.listDeliveryChallans(req.organizationId);
  }

  @Post('challans')
  async createDeliveryChallan(
    @Req() req: any,
    @Body() body: CreateDeliveryChallanDto
  ) {
    return this.ordersService.createDeliveryChallan(req.organizationId, body);
  }

  // --- Credit Notes (Sales Return) ---
  @Get('credit-notes')
  async listCreditNotes(@Req() req: any) {
    return this.ordersService.listCreditNotes(req.organizationId);
  }

  @Post('credit-notes')
  async createCreditNote(@Req() req: any, @Body() body: CreateCreditNoteDto) {
    return this.ordersService.createCreditNote(req.organizationId, body);
  }

  // --- Debit Notes (Purchase Return) ---
  @Get('debit-notes')
  async listDebitNotes(@Req() req: any) {
    return this.ordersService.listDebitNotes(req.organizationId);
  }

  @Post('debit-notes')
  async createDebitNote(@Req() req: any, @Body() body: CreateDebitNoteDto) {
    return this.ordersService.createDebitNote(req.organizationId, body);
  }
}
