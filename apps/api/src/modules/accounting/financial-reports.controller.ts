import { Controller, Get, Req } from '@nestjs/common';
import { FinancialReportsService } from './financial-reports.service';

@Controller('accounting/reports')
export class FinancialReportsController {
  constructor(private readonly reportsService: FinancialReportsService) {}

  @Get('trial-balance')
  async getTrialBalance(@Req() req: any) {
    return this.reportsService.getTrialBalance(req.organizationId);
  }

  @Get('profit-loss')
  async getProfitAndLoss(@Req() req: any) {
    return this.reportsService.getProfitAndLoss(req.organizationId);
  }

  @Get('balance-sheet')
  async getBalanceSheet(@Req() req: any) {
    return this.reportsService.getBalanceSheet(req.organizationId);
  }
}
