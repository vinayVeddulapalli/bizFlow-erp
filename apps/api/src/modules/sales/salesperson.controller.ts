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
import { SalespersonService, CreateSalespersonDto } from './salesperson.service';

@ApiTags('Salespersons & Field Staff')
@Controller('sales/salespersons')
export class SalespersonController {
  constructor(private readonly salespersonService: SalespersonService) {}

  @Get()
  @ApiOperation({ summary: 'List all salespersons with sales attribution' })
  async list(@Req() req: any) {
    return this.salespersonService.list(req.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new salesperson master record' })
  async create(@Req() req: any, @Body() dto: CreateSalespersonDto) {
    return this.salespersonService.create(req.organizationId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update salesperson details or active status' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSalespersonDto> & { isActive?: boolean },
  ) {
    return this.salespersonService.update(req.organizationId, id, dto);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get salesperson performance and commission report' })
  async getReport(@Req() req: any) {
    return this.salespersonService.getPerformanceReport(req.organizationId);
  }
}
