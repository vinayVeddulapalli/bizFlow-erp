import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  organizationId: string;
  branchId?: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export const ActiveTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  }
);
