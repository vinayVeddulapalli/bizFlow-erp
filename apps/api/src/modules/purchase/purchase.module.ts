import { Module } from '@nestjs/common';
import { PurchaseBillService } from './purchase-bill.service';
import { PurchaseBillController } from './purchase-bill.controller';

@Module({
  controllers: [PurchaseBillController],
  providers: [PurchaseBillService],
  exports: [PurchaseBillService],
})
export class PurchaseModule {}
