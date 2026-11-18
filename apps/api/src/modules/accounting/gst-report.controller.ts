import { Controller, Get, Query, Req } from '@nestjs/common';
import { GstReportService } from './gst-report.service';

@Controller('gst/reports')
export class GstReportController {
  constructor(private readonly gstReportService: GstReportService) {}

  @Get('gstr1')
  async getGstr1(
    @Req() req: any,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('month') month?: string
  ) {
    return this.gstReportService.getGstr1(
      req.organizationId,
      fiscalYear,
      month ? parseInt(month, 10) : undefined
    );
  }

  @Get('gstr3b')
  async getGstr3b(
    @Req() req: any,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('month') month?: string
  ) {
    return this.gstReportService.getGstr3b(
      req.organizationId,
      fiscalYear,
      month ? parseInt(month, 10) : undefined
    );
  }
}
