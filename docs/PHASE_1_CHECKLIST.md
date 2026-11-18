# BizFlow ERP — Phase 1 Implementation Checklist

## Objective
Establish the foundational monorepo infrastructure, local development services, database persistence layer, authentication and multi-tenancy engine, organization management, and web dashboard shell.

---

## Task Breakdown & Verification Status

### 1. Monorepo & Workspace Initialization
- [x] Initialize git repository with root `.gitignore` and `.gitattributes`.
- [x] Configure `pnpm-workspace.yaml` defining `apps/*` and `packages/*`.
- [x] Configure `turbo.json` with build, lint, dev, and test task pipelines.
- [x] Create root `package.json` with coordinated dev scripts (`pnpm dev`, `pnpm build`, `pnpm lint`).
- [x] Configure unified `@bizflow/tsconfig` base TypeScript configurations.

### 2. Local Infrastructure (Docker & Configuration)
- [x] Create `database/docker/docker-compose.yml`:
  - [x] PostgreSQL 16 Alpine container (port 5432, persistent volume).
  - [x] Redis 7 Alpine container (port 6379, password protected).
  - [x] MinIO container (port 9000 API, port 9001 Console) for S3-compatible local file storage.
- [x] Create `.env.example` and `.env` with local service connection strings.

### 3. Shared Packages Implementation
- [x] **`packages/shared-types`**:
  - [x] Define User, Organization, Branch, Role, and Member contracts.
  - [x] Define API Response envelopes (`ApiResponse<T>`, `ApiErrorResponse`).
  - [x] Define Standard Pagination and Query DTO interfaces.
- [x] **`packages/validation`**:
  - [x] Create Zod schemas for user registration, login, password reset.
  - [x] Create Zod schemas for organization creation and branch updates.
- [x] **`packages/shared-utils`**:
  - [x] Implement `decimal.js` financial math wrapper functions (`add`, `subtract`, `multiply`, `roundFinancial`, `formatCurrency`).
  - [x] Implement Indian GST tax calculator (Intra-state CGST+SGST vs Inter-state IGST).
  - [x] Implement 2-digit Indian State Code lookup dictionary (01 to 38).

### 4. NestJS Backend Core (`apps/api`)
- [x] Scaffold NestJS application with TypeScript and SWC compiler for speed.
- [x] Install and configure `@nestjs/config`.
- [x] Configure `@nestjs/swagger` with OpenAPI 3.0 specification served at `/api/docs`.
- [x] Implement Global Exception Filter adhering to RFC 7807 problem details.
- [x] Implement Global Transform Interceptor formatting standard API envelopes.
- [x] Configure CORS with credentials support.

### 5. Database Schema & Prisma Engine
- [x] Configure Prisma ORM with PostgreSQL datasource in `database/prisma/schema.prisma`.
- [x] Write initial schema definitions:
  - [x] `User`, `Organization`, `OrganizationMember`, `Role`, `Branch`, `Warehouse`.
  - [x] `AuditLog`, `IdempotencyRecord`.
- [x] Generate initial Prisma client types.
- [x] Create database seed script (`database/prisma/seed.ts`):
  - [x] System roles (`SuperAdmin`, `Admin`, `Accountant`, `SalesManager`, `InventoryManager`).
  - [x] Default SuperAdmin test account (`admin@bizflow.local` / `Password@123`).
  - [x] Seed initial demo organization ("Acme Enterprises") with Mumbai branch and Central warehouse.

### 6. Authentication & IAM Module
- [x] Implement Argon2id password hashing and verification service (`memoryCost: 65536, timeCost: 3, parallelism: 4`).
- [x] Implement JWT token generator (Access Token: 15-minute TTL, signed with secure secret).
- [x] Build Auth Controllers & Services:
  - [x] `POST /api/v1/auth/register` (Registers user, creates default business org, branch, warehouse, and SuperAdmin role).
  - [x] `POST /api/v1/auth/login` (Validates credentials, sets httpOnly refresh cookie, returns access JWT).
  - [x] `POST /api/v1/auth/refresh` (Validates session, issues refreshed access token).
  - [x] `POST /api/v1/auth/logout` (Clears session cookie).
  - [x] `GET /api/v1/auth/me` (Returns user profile and list of accessible organizations).
- [x] Implement `JwtAuthGuard`, `TenantContextMiddleware`, and `RolesAndPermissionsGuard`.

### 7. Organization & Branch Management Module
- [x] Implement `POST /api/v1/organizations` (Create new tenant company, default branch, warehouse).
- [x] Implement `GET /api/v1/organizations` (List user's organizations with role and branch count).
- [x] Implement `GET /api/v1/organizations/:id` (Fetch settings, branch count, member count).
- [x] Implement `POST /api/v1/organizations/:id/switch` (Switch active tenant context).
- [x] Implement `GET /api/v1/branches` & `POST /api/v1/branches` (Multi-branch support).

### 8. Next.js Web Application Foundation (`apps/web`)
- [x] Initialize Next.js 15 App Router application with TypeScript and Tailwind CSS.
- [x] Set up `@tanstack/react-query` provider with optimized caching.
- [x] Configure Axios API client with automatic JWT and `X-Organization-Id` injection.
- [x] Implement Authentication Context (`useAuth()`) with silent refresh and persistent org switcher.

### 9. Web User Interface & Tenant Flow
- [x] Build Landing page (`/`) showcasing platform pillars.
- [x] Build Login page (`/login`) with validation and remember-me behavior.
- [x] Build Register page (`/register`) with business provisioning.
- [x] Build Application Shell (`apps/web/src/app/(dashboard)/layout.tsx`):
  - [x] Persistent Global Topbar with dynamic **Organization Switcher Dropdown**.
  - [x] Active Branch Pill ("Head Office (Mumbai)").
  - [x] User menu with logout action.
  - [x] Collapsible Sidebar with module navigation.

### 10. Executive Dashboard Shell
- [x] Implement backend `GET /api/v1/dashboard/summary` querying real database counts and audit logs.
- [x] Build Dashboard page (`/dashboard`):
  - [x] 4 Core Financial KPI Stat Cards (Total Revenue, Total Purchases, Receivables, Payables).
  - [x] Company Operating Footprint (Branches, Warehouses, Team Members).
  - [x] Recent Enterprise Audit Activity Stream.

---

## Verification Result
- **Full Monorepo Build**: `turbo run build` passed with **5 successful tasks, 0 failures**.
- **TypeScript**: Zero compilation errors across `@bizflow/api`, `@bizflow/web`, and all 3 shared packages.
- **Git Milestone**: Committed to repository.
