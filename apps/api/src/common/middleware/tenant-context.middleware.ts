import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request & { tenant?: any; user?: any; organizationId?: string }, _res: Response, next: NextFunction) {
    // If not authenticated yet (public routes like /auth/login), pass through
    if (!req.user || !req.user.id) {
      return next();
    }

    const orgIdHeader = req.headers['x-organization-id'] as string;
    const branchIdHeader = req.headers['x-branch-id'] as string;

    try {
      // Find user memberships
      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId: req.user.id },
        include: {
          organization: true,
          role: true,
        },
      });

      if (memberships.length === 0) {
        // User has not joined or created an organization yet
        return next();
      }

      let activeMembership = memberships[0];
      if (orgIdHeader) {
        const found = memberships.find((m) => m.organizationId === orgIdHeader);
        if (!found) {
          throw new ForbiddenException(
            'Access denied: You do not have valid membership in the specified organization'
          );
        }
        activeMembership = found;
      } else {
        // Default to default org or first
        const defaultMember = memberships.find((m) => m.isDefault);
        if (defaultMember) {
          activeMembership = defaultMember;
        }
      }

      req.organizationId = activeMembership.organizationId;
      req.tenant = {
        organizationId: activeMembership.organizationId,
        organizationName: activeMembership.organization.name,
        branchId: branchIdHeader || undefined,
        roleId: activeMembership.roleId,
        roleName: activeMembership.role.name,
        permissions: activeMembership.role.permissions || [],
      };

      next();
    } catch (err) {
      next(err);
    }
  }
}
