import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  BankingService,
  CreateBankAccountDto,
  RecordTransactionDto,
  CreateLoanAccountDto,
} from './banking.service';

@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.bankingService.getOverview(req.organizationId);
  }

  // --- Bank Accounts ---
  @Get('accounts')
  async listAccounts(@Req() req: any) {
    return this.bankingService.listAccounts(req.organizationId);
  }

  @Post('accounts')
  async createAccount(@Req() req: any, @Body() body: CreateBankAccountDto) {
    return this.bankingService.createAccount(req.organizationId, body);
  }

  // --- Transactions & Passbook ---
  @Get('transactions')
  async listTransactions(
    @Req() req: any,
    @Query('bankAccountId') bankAccountId?: string
  ) {
    return this.bankingService.listTransactions(req.organizationId, bankAccountId);
  }

  @Post('transactions')
  async recordTransaction(@Req() req: any, @Body() body: RecordTransactionDto) {
    return this.bankingService.recordTransaction(req.organizationId, body);
  }

  @Patch('transactions/:id/reconcile')
  async reconcileTransaction(@Req() req: any, @Param('id') id: string) {
    return this.bankingService.reconcileTransaction(req.organizationId, id);
  }

  // --- Loans & EMIs ---
  @Get('loans')
  async listLoans(@Req() req: any) {
    return this.bankingService.listLoans(req.organizationId);
  }

  @Post('loans')
  async createLoan(@Req() req: any, @Body() body: CreateLoanAccountDto) {
    return this.bankingService.createLoan(req.organizationId, body);
  }

  @Post('loans/emi/:id/pay')
  async payEmi(@Req() req: any, @Param('id') id: string) {
    return this.bankingService.payEmi(req.organizationId, id);
  }
}
