import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { createBranchSchema } from '@bizflow/validation';
import { RequirePermissions } from '../../common/decorators/roles.decorator';

@ApiTags('Branches & Multi-Locations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches for active organization' })
  async listBranches(@ActiveTenant() tenant: TenantContext) {
    return this.branchService.listBranches(tenant.organizationId);
  }

  @Post()
  @RequirePermissions('branches.create', 'org.manage')
  @ApiOperation({ summary: 'Create new branch in active organization' })
  async createBranch(
    @ActiveTenant() tenant: TenantContext,
    @Body() body: any
  ) {
    const validated = createBranchSchema.parse(body);
    return this.branchService.createBranch(tenant.organizationId, validated);
  }
}
