import { Module } from '@nestjs/common';
import { SalesInvoiceService } from './sales-invoice.service';
import { SalesInvoiceController } from './sales-invoice.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [SalesInvoiceController, PaymentController],
  providers: [SalesInvoiceService, PaymentService],
  exports: [SalesInvoiceService, PaymentService],
})
export class SalesModule {}
