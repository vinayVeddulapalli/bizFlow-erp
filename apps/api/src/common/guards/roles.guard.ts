import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesAndPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const { tenant } = context.switchToHttp().getRequest();
    if (!tenant) {
      throw new ForbiddenException('Tenant context missing for authorized route');
    }

    const userPermissions: string[] = tenant.permissions || [];
    const isSuperAdmin = userPermissions.includes('*') || tenant.roleName === 'SuperAdmin';
    if (isSuperAdmin) {
      return true;
    }

    // Role check
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(tenant.roleName);
      if (!hasRole) {
        throw new ForbiddenException(
          `Action requires one of the following roles: ${requiredRoles.join(', ')}`
        );
      }
    }

    // Permission check
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions.includes(perm) ||
        userPermissions.some((p) => p.endsWith('.*') && perm.startsWith(p.replace('.*', '')))
      );
      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
        );
      }
    }

    return true;
  }
}
