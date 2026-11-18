export interface OrganizationDto {
  id: string;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  currencyCode: string;
  fiscalYearStartMonth: number;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  gstin?: string | null;
  addressLine1: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  isMainBranch: boolean;
}

export interface WarehouseDto {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: string[];
}
