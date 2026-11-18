import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const can = (await super.canActivate(context)) as boolean;
    if (!can) return false;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (user && user.id) {
      const orgIdHeader = (req.headers['x-organization-id'] || req.headers['X-Organization-Id']) as string;
      const branchIdHeader = (req.headers['x-branch-id'] || req.headers['X-Branch-Id']) as string;

      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId: user.id },
        include: {
          organization: true,
          role: true,
        },
      });

      if (memberships.length > 0) {
        let activeMembership = memberships[0];
        if (orgIdHeader) {
          const found = memberships.find((m) => m.organizationId === orgIdHeader);
          if (found) {
            activeMembership = found;
          }
        } else {
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
      }
    }

    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication credentials invalid or expired');
    }
    return user;
  }
}
