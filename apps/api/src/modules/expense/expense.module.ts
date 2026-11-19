import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController, OtherIncomeController } from './expense.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [ExpenseController, OtherIncomeController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
