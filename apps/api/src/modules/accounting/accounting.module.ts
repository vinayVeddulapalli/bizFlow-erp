import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';
import { GstReportController } from './gst-report.controller';
import { GstReportService } from './gst-report.service';

@Module({
  controllers: [
    AccountController,
    JournalController,
    FinancialReportsController,
    GstReportController,
  ],
  providers: [
    AccountService,
    JournalService,
    FinancialReportsService,
    GstReportService,
  ],
  exports: [
    AccountService,
    JournalService,
    FinancialReportsService,
    GstReportService,
  ],
})
export class AccountingModule {}
