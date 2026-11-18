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
import { LeadService } from './lead.service';
import {
  CreateLeadInput,
  UpdateLeadStatusInput,
  AddLeadActivityInput,
} from '@bizflow/validation';
import { LeadStatus } from '@prisma/client';

@Controller('crm/leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async listLeads(
    @Req() req: any,
    @Query('status') status?: LeadStatus,
    @Query('search') search?: string
  ) {
    return this.leadService.listLeads(req.organizationId, status, search);
  }

  @Get(':id')
  async getLeadById(@Req() req: any, @Param('id') id: string) {
    return this.leadService.getLeadById(req.organizationId, id);
  }

  @Post()
  async createLead(@Req() req: any, @Body() body: CreateLeadInput) {
    return this.leadService.createLead(req.organizationId, body);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateLeadStatusInput
  ) {
    return this.leadService.updateStatus(
      req.organizationId,
      id,
      body.status,
      body.notes || undefined
    );
  }

  @Post(':id/convert')
  async convertToCustomer(@Req() req: any, @Param('id') id: string) {
    return this.leadService.convertToCustomer(req.organizationId, id);
  }

  @Post(':id/activities')
  async addActivity(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: AddLeadActivityInput
  ) {
    return this.leadService.addActivity(req.organizationId, id, body);
  }
}
