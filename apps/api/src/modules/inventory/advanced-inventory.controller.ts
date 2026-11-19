import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import {
  AdvancedInventoryService,
  CreateBatchDto,
  CreateSerialDto,
  UpsertConversionDto,
  UpsertPartyPriceDto,
} from './advanced-inventory.service';

@Controller('inventory/advanced')
export class AdvancedInventoryController {
  constructor(
    private readonly advancedService: AdvancedInventoryService
  ) {}

  // --- Batches ---
  @Get('batches')
  async listBatches(
    @Req() req: any,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string
  ) {
    return this.advancedService.listBatches(
      req.organizationId,
      productId,
      warehouseId
    );
  }

  @Post('batches')
  async createBatch(@Req() req: any, @Body() body: CreateBatchDto) {
    return this.advancedService.createBatch(req.organizationId, body);
  }

  // --- Serials ---
  @Get('serials')
  async listSerials(
    @Req() req: any,
    @Query('productId') productId?: string,
    @Query('status') status?: string
  ) {
    return this.advancedService.listSerials(
      req.organizationId,
      productId,
      status
    );
  }

  @Post('serials')
  async createSerial(@Req() req: any, @Body() body: CreateSerialDto) {
    return this.advancedService.createSerial(req.organizationId, body);
  }

  // --- Unit Conversions ---
  @Get('conversions')
  async listConversions(@Req() req: any) {
    return this.advancedService.listUnitConversions(req.organizationId);
  }

  @Put('conversions')
  async upsertConversion(@Req() req: any, @Body() body: UpsertConversionDto) {
    return this.advancedService.upsertUnitConversion(req.organizationId, body);
  }

  // --- Party Price Matrix ---
  @Get('price-matrix')
  async listPartyPrices(@Req() req: any, @Query('partyId') partyId?: string) {
    return this.advancedService.listPartyPrices(req.organizationId, partyId);
  }

  @Put('price-matrix')
  async upsertPartyPrice(@Req() req: any, @Body() body: UpsertPartyPriceDto) {
    return this.advancedService.upsertPartyPrice(req.organizationId, body);
  }
}
