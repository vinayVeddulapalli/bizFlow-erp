import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { PosService, PosCheckoutInput } from './pos.service';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('registers')
  async listRegisters(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.posService.listRegisters(req.organizationId, branchId);
  }

  @Get('sessions/active')
  async getActiveSession(@Req() req: any, @Query('registerId') registerId: string) {
    return this.posService.getActiveSession(req.organizationId, registerId);
  }

  @Post('sessions/open')
  async openSession(
    @Req() req: any,
    @Body() body: { registerId: string; openingFloat: number; notes?: string }
  ) {
    return this.posService.openSession(req.organizationId, req.user?.id || 'system', body);
  }

  @Post('sessions/close')
  async closeSession(
    @Req() req: any,
    @Body() body: { sessionId: string; closingCash: number; notes?: string }
  ) {
    return this.posService.closeSession(req.organizationId, req.user?.id || 'system', body);
  }

  @Post('checkout')
  async checkout(@Req() req: any, @Body() body: PosCheckoutInput) {
    return this.posService.checkout(req.organizationId, req.user?.id || 'system', body);
  }
}
