import { Module } from '@nestjs/common';
import { SalesInvoiceService } from './sales-invoice.service';
import { SalesInvoiceController } from './sales-invoice.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { SalespersonService } from './salesperson.service';
import { SalespersonController } from './salesperson.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [SalesInvoiceController, PaymentController, SalespersonController],
  providers: [SalesInvoiceService, PaymentService, SalespersonService],
  exports: [SalesInvoiceService, PaymentService, SalespersonService],
})
export class SalesModule {}
