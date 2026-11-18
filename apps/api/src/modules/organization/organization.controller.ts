import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createOrganizationSchema } from '@bizflow/validation';

@ApiTags('Organizations & Tenancy')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business organization (tenant)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: any
  ) {
    const validated = createOrganizationSchema.parse(body);
    return this.orgService.createOrganization(userId, validated);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations the user is a member of' })
  async listUserOrgs(@CurrentUser('id') userId: string) {
    return this.orgService.getUserOrganizations(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific organization' })
  async getOne(
    @Param('id') orgId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.orgService.getOrganization(orgId, userId);
  }

  @Post(':id/switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active organization context' })
  async switchOrg(
    @Param('id') orgId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.orgService.switchOrganization(userId, orgId);
  }
}
