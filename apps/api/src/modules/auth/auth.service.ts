import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as argon2 from 'argon2';
import { RegisterInput, LoginInput } from '@bizflow/validation';
import { AuthTokens, AuthenticatedUser, UserMembership } from '@bizflow/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email address already exists');
    }

    // 1. Hash password with Argon2id
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 2. Fetch or create SuperAdmin system role
    let superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'SuperAdmin', isSystem: true },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: 'SuperAdmin',
          description: 'Full administrative control over all tenant modules',
          isSystem: true,
          permissions: ['*'],
        },
      });
    }

    // 3. Atomically create User, Organization, Branch, Warehouse, and Membership
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phoneNumber: input.phoneNumber,
          passwordHash,
          isEmailVerified: true, // auto-verify initial admin
        },
      });

      const org = await tx.organization.create({
        data: {
          name: input.businessName,
          currencyCode: 'INR',
          fiscalYearStartMonth: 4,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: 'Head Office',
          code: 'HQ-01',
          addressLine1: 'Main Business Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          stateCode: '27',
          postalCode: '400001',
          isMainBranch: true,
        },
      });

      const warehouse = await tx.warehouse.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          name: 'Main Warehouse',
          code: 'WH-01',
          isDefault: true,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          roleId: superAdminRole!.id,
          isDefault: true,
        },
      });

      return { user, org, branch, warehouse };
    });

    const tokens = await this.generateTokens(result.user.id, result.user.email, result.org.id);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        phoneNumber: result.user.phoneNumber,
        avatarUrl: result.user.avatarUrl,
        isEmailVerified: result.user.isEmailVerified,
        activeOrganizationId: result.org.id,
        activeBranchId: result.branch.id,
        roles: [superAdminRole.name],
        permissions: superAdminRole.permissions,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens; memberships: UserMembership[] }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    const defaultMembership =
      user.memberships.find((m) => m.isDefault) || user.memberships[0];

    const memberships: UserMembership[] = user.memberships.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      roleId: m.roleId,
      roleName: m.role.name,
      isDefault: m.isDefault,
      permissions: m.role.permissions,
    }));

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      defaultMembership?.organizationId
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        activeOrganizationId: defaultMembership?.organizationId || null,
        roles: defaultMembership ? [defaultMembership.role.name] : [],
        permissions: defaultMembership ? defaultMembership.role.permissions : [],
      },
      tokens,
      memberships,
    };
  }

  async refreshTokens(userId: string, orgId?: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account invalid or deactivated');
    }

    return this.generateTokens(user.id, user.email, orgId);
  }

  async getMe(userId: string): Promise<{ user: AuthenticatedUser; memberships: UserMembership[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const defaultMembership =
      user.memberships.find((m) => m.isDefault) || user.memberships[0];

    const memberships: UserMembership[] = user.memberships.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      roleId: m.roleId,
      roleName: m.role.name,
      isDefault: m.isDefault,
      permissions: m.role.permissions,
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        activeOrganizationId: defaultMembership?.organizationId || null,
        roles: defaultMembership ? [defaultMembership.role.name] : [],
        permissions: defaultMembership ? defaultMembership.role.permissions : [],
      },
      memberships,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    orgId?: string
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, orgId };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'bizflow_super_secret_jwt_access_key_change_in_production_min32chars';
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '7d';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    return {
      accessToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }
}
