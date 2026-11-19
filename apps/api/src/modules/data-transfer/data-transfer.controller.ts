import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataTransferService } from './data-transfer.service';

@ApiTags('Data Import, Export, Tally & Backup')
@Controller('data-transfer')
export class DataTransferController {
  constructor(private readonly dataTransferService: DataTransferService) {}

  @Get('export/:entity')
  @ApiOperation({ summary: 'Export entity data (products, customers, invoices, tally-xml)' })
  async exportEntity(
    @Req() req: any,
    @Param('entity') entity: string,
  ) {
    return this.dataTransferService.exportEntity(req.organizationId, entity);
  }

  @Post('import/products')
  @ApiOperation({ summary: 'Bulk import products from CSV/Excel JSON' })
  async importProducts(
    @Req() req: any,
    @Body() body: { items: any[] },
  ) {
    return this.dataTransferService.importProducts(req.organizationId, body.items);
  }

  @Get('backup/snapshot')
  @ApiOperation({ summary: 'Download complete organization database backup snapshot' })
  async getBackupSnapshot(@Req() req: any) {
    return this.dataTransferService.generateFullBackupSnapshot(req.organizationId);
  }
}
