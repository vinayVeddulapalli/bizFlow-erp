export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  activeOrganizationId?: string | null;
  activeBranchId?: string | null;
  roles: string[];
  permissions: string[];
}

export interface UserMembership {
  id: string;
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  isDefault: boolean;
  permissions: string[];
}

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  fullName: string;
  orgId?: string;
  branchId?: string;
  role?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}
