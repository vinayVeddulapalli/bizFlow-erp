# BizFlow ERP — Phase 1 Implementation Checklist

## Objective
Establish the foundational monorepo infrastructure, local development services, database persistence layer, authentication and multi-tenancy engine, organization management, and web dashboard shell.

---

## Task Breakdown

### 1. Monorepo & Workspace Initialization
- [ ] Initialize git repository with root `.gitignore` and `.gitattributes`.
- [ ] Configure `pnpm-workspace.yaml` defining `apps/*` and `packages/*`.
- [ ] Configure `turbo.json` with build, lint, dev, and test task pipelines.
- [ ] Create root `package.json` with coordinated dev scripts (`pnpm dev`, `pnpm build`, `pnpm lint`).
- [ ] Configure unified `@bizflow/tsconfig` base TypeScript configurations.
- [ ] Configure unified `@bizflow/eslint-config` rules.

### 2. Local Infrastructure (Docker Compose)
- [ ] Create `database/docker/docker-compose.yml`:
  - [ ] PostgreSQL 16 Alpine container (port 5432, persistent volume).
  - [ ] Redis 7 Alpine container (port 6379, password protected).
  - [ ] MinIO container (port 9000 API, port 9001 Console) for S3-compatible local file storage.
- [ ] Create `.env.example` in root with local service connection strings.
- [ ] Verify local containers spin up cleanly and accept socket connections.

### 3. Shared Packages Implementation
- [ ] **`packages/shared-types`**:
  - [ ] Define User, Organization, Branch, Role, and Member contracts.
  - [ ] Define API Response envelopes (`ApiResponse<T>`, `ApiErrorResponse`).
  - [ ] Define Standard Pagination and Query DTO interfaces.
- [ ] **`packages/validation`**:
  - [ ] Create Zod schemas for user registration, login, password reset.
  - [ ] Create Zod schemas for organization creation and branch updates.
- [ ] **`packages/shared-utils`**:
  - [ ] Implement `decimal.js` financial math wrapper functions (`add`, `subtract`, `multiply`, `roundToPlaces`).
  - [ ] Implement Indian GST format and checksum validator.
  - [ ] Implement State Code lookup dictionary (01 to 38).

### 4. NestJS Backend Core (`apps/api`)
- [ ] Scaffold NestJS application with TypeScript and SWC compiler for speed.
- [ ] Install and configure `@nestjs/config` with Zod environment validation.
- [ ] Configure `@nestjs/swagger` with OpenAPI 3.0 specification served at `/api/docs`.
- [ ] Implement Global Exception Filter adhering to RFC 7807 problem details.
- [ ] Implement Global Validation Pipe enforcing strict whitelist stripping.
- [ ] Configure Winston structured JSON logger with request correlation IDs.
- [ ] Configure Helmet security headers and CORS whitelist.

### 5. Database Schema & Prisma Engine
- [ ] Configure Prisma ORM with PostgreSQL datasource in `database/prisma`.
- [ ] Write initial schema definitions:
  - [ ] `User`, `Organization`, `OrganizationMember`, `Role`, `Branch`, `Warehouse`.
  - [ ] `AuditLog`, `IdempotencyRecord`.
- [ ] Generate initial database migration: `0_init_tenancy_and_auth`.
- [ ] Create database seed script (`prisma/seed.ts`):
  - [ ] System roles (`SuperAdmin`, `Admin`, `Manager`, `Accountant`, `SalesRep`).
  - [ ] Default SuperAdmin test account.
  - [ ] Seed initial demo organization ("Acme Enterprises") with Mumbai branch and Main warehouse.
- [ ] Implement Prisma Tenant Context Client Extension to automatically scope queries by `organization_id`.

### 6. Authentication & IAM Module
- [ ] Implement Argon2id password hashing and verification service.
- [ ] Implement JWT token generator (Access Token: 15-minute TTL, signed with RSA/HMAC secret).
- [ ] Implement Refresh Token generator (7-day TTL, stored with token family in Redis).
- [ ] Build Auth Controllers & Services:
  - [ ] `POST /api/v1/auth/register` (Registers user, creates default personal org, returns tokens).
  - [ ] `POST /api/v1/auth/login` (Validates credentials, sets httpOnly refresh cookie, returns access JWT).
  - [ ] `POST /api/v1/auth/refresh` (Validates refresh cookie, issues new rotated token pair).
  - [ ] `POST /api/v1/auth/logout` (Revokes refresh token in Redis, clears cookie).
  - [ ] `GET /api/v1/auth/me` (Returns current user details and accessible organizations).
- [ ] Implement `JwtAuthGuard`, `TenantContextMiddleware`, and `RolesAndPermissionsGuard`.

### 7. Organization & Branch Management Module
- [ ] Implement `POST /api/v1/organizations` (Create new tenant company, seed default roles & main warehouse).
- [ ] Implement `GET /api/v1/organizations` (List user's organizations).
- [ ] Implement `GET /api/v1/organizations/:id` (Fetch settings, GSTIN, fiscal year configuration).
- [ ] Implement `PATCH /api/v1/organizations/:id` (Update settings).
- [ ] Implement `GET /api/v1/branches` & `POST /api/v1/branches` (Manage multi-branch locations).
- [ ] Implement `POST /api/v1/members/invite` (Invite collaborator with assigned role).

### 8. Next.js Web Application Foundation (`apps/web`)
- [ ] Initialize Next.js 15+ App Router application with TypeScript and Tailwind CSS.
- [ ] Set up `@tanstack/react-query` provider with optimized caching and error handling.
- [ ] Install Lucide React icons.
- [ ] Implement BizFlow Design System primitives (Buttons, Inputs, Dialogs, Dropdowns, Badges, Cards, Skeleton frames).
- [ ] Configure `axios` or native `fetch` client with automatic 401 interceptor for silent token refresh.
- [ ] Implement Toast Notification provider.

### 9. Web User Interface & Tenant Flow
- [ ] Build modern Authentication screens:
  - [ ] Login screen with email/password, validation feedback, and "Remember Me".
  - [ ] Registration screen with name, email, password, and business name.
  - [ ] Forgot password & reset password screens.
- [ ] Build Application Shell:
  - [ ] Collapsible multi-tier Sidebar navigation with active route highlights.
  - [ ] Persistent Global Topbar with:
    - [ ] Dynamic **Organization Switcher Dropdown**.
    - [ ] Active **Branch Indicator Badge**.
    - [ ] Quick Action (`+ New`) menu.
    - [ ] User Profile menu with Logout action.
- [ ] Build Organization Creation & Settings modal.

### 10. Executive Dashboard Shell
- [ ] Implement backend `GET /api/v1/dashboard/summary` endpoint querying actual database records:
  - [ ] Total Sales (Sum of posted sales invoices).
  - [ ] Total Purchases (Sum of posted purchase bills).
  - [ ] Outstanding Receivables (Sum of customer unpaid balances).
  - [ ] Outstanding Payables (Sum of supplier unpaid balances).
- [ ] Build responsive Dashboard UI:
  - [ ] 4 Top KPI Stat Cards (Sales, Purchases, Receivables, Payables) with animated numbers.
  - [ ] Quick Action Shortcuts (New Invoice, New Customer, New Product).
  - [ ] Recent Activity Stream widget.
  - [ ] Low Stock & Reorder Alert widget (ready for Phase 3 data).

---

## Definition of Done (DoD) for Phase 1
1. **Zero Build Errors**: `pnpm build` executes cleanly across all apps and packages.
2. **Type Safety**: Zero TypeScript compilation warnings or `any` escapes in core domain logic.
3. **Container Health**: PostgreSQL, Redis, and MinIO run stably via Docker Compose.
4. **End-to-End User Flow**:
   - New user can register on the web interface.
   - User automatically receives an organization and main branch.
   - User can create a second organization and seamlessly switch between them using the top-bar dropdown.
   - Access tokens refresh invisibly in the background without UI interruption.
   - Refresh token reuse triggers an immediate security alert and revokes the token family.
5. **Database Multi-Tenancy**: Records created in Organization A are completely invisible when switched to Organization B.
6. **Codebase Cleanliness**: All code passes ESLint and Prettier formatting checks.
