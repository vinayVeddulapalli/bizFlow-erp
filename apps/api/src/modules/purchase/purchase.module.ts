import { Module } from '@nestjs/common';
import { PurchaseBillService } from './purchase-bill.service';
import { PurchaseBillController } from './purchase-bill.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [PurchaseBillController],
  providers: [PurchaseBillService],
  exports: [PurchaseBillService],
})
export class PurchaseModule {}
