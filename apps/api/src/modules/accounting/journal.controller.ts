import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { JournalService } from './journal.service';
import { CreateJournalEntryInput } from '@bizflow/validation';

@Controller('accounting/journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  async listJournalEntries(
    @Req() req: any,
    @Query('referenceType') referenceType?: string
  ) {
    return this.journalService.listJournalEntries(req.organizationId, referenceType);
  }

  @Get(':id')
  async getJournalEntryById(@Req() req: any, @Param('id') id: string) {
    return this.journalService.getJournalEntryById(req.organizationId, id);
  }

  @Post()
  async createJournalEntry(@Req() req: any, @Body() body: CreateJournalEntryInput) {
    return this.journalService.createJournalEntry(req.organizationId, body);
  }
}
