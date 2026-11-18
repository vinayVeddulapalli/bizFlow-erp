import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ActiveTenant, TenantContext } from '../../common/decorators/tenant.decorator';

@ApiTags('Executive Dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Active organization ID' })
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get live KPI cards and dashboard summary from database records' })
  async getSummary(@ActiveTenant() tenant: TenantContext) {
    return this.dashboardService.getSummary(tenant.organizationId);
  }
}
