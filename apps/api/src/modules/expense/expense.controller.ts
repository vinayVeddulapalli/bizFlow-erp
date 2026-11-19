import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ExpenseService, CreateExpenseInput, CreateOtherIncomeInput } from './expense.service';

@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  async listExpenses(
    @Req() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('isGstClaimable') isGstClaimable?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.expenseService.listExpenses(req.organizationId, {
      categoryId,
      isGstClaimable: isGstClaimable ? isGstClaimable === 'true' : undefined,
      startDate,
      endDate,
    });
  }

  @Post()
  async createExpense(@Req() req: any, @Body() body: CreateExpenseInput) {
    return this.expenseService.createExpense(req.organizationId, body);
  }

  @Get('categories')
  async listCategories(@Req() req: any) {
    return this.expenseService.listCategories(req.organizationId);
  }

  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: { name: string; code?: string; isTaxDeductible?: boolean }) {
    return this.expenseService.createCategory(req.organizationId, body);
  }

  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.expenseService.getFinancialOverview(req.organizationId);
  }
}

@Controller('other-income')
export class OtherIncomeController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  async listOtherIncome(@Req() req: any) {
    return this.expenseService.listOtherIncome(req.organizationId);
  }

  @Post()
  async createOtherIncome(@Req() req: any, @Body() body: CreateOtherIncomeInput) {
    return this.expenseService.createOtherIncome(req.organizationId, body);
  }

  @Get('categories')
  async listIncomeCategories(@Req() req: any) {
    return this.expenseService.listIncomeCategories(req.organizationId);
  }

  @Post('categories')
  async createIncomeCategory(@Req() req: any, @Body() body: { name: string }) {
    return this.expenseService.createIncomeCategory(req.organizationId, body);
  }
}
