import { Controller, Get, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('aging/receivables')
  async getReceivablesAging(@Req() req: any) {
    return this.reportsService.getAgingAnalysis(req.organizationId, 'RECEIVABLES');
  }

  @Get('aging/payables')
  async getPayablesAging(@Req() req: any) {
    return this.reportsService.getAgingAnalysis(req.organizationId, 'PAYABLES');
  }

  @Get('inventory/valuation')
  async getStockValuation(@Req() req: any) {
    return this.reportsService.getStockValuation(req.organizationId);
  }

  @Get('registers/sales')
  async getSalesRegister(@Req() req: any) {
    return this.reportsService.getRegister(req.organizationId, 'SALES');
  }

  @Get('registers/purchase')
  async getPurchaseRegister(@Req() req: any) {
    return this.reportsService.getRegister(req.organizationId, 'PURCHASE');
  }
}
