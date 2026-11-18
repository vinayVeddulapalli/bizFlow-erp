import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountInput } from '@bizflow/validation';

@Controller('accounting/accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async listAccounts(@Req() req: any) {
    return this.accountService.listAccounts(req.organizationId);
  }

  @Get(':id')
  async getAccountById(@Req() req: any, @Param('id') id: string) {
    return this.accountService.getAccountById(req.organizationId, id);
  }

  @Get(':id/ledger')
  async getAccountLedger(@Req() req: any, @Param('id') id: string) {
    return this.accountService.getAccountLedger(req.organizationId, id);
  }

  @Post()
  async createAccount(@Req() req: any, @Body() body: CreateAccountInput) {
    return this.accountService.createAccount(req.organizationId, body);
  }
}
