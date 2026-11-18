# BizFlow ERP — Architecture Decision Records (ADRs)

## ADR 001: Monorepo Structure with Turborepo & pnpm

### Status: Accepted
### Context
BizFlow ERP consists of a Next.js web application, a NestJS backend API, a future React Native mobile application, and shared packages (types, validation schemas, utility functions). Managing separate git repositories leads to duplicated types, drift between backend DTOs and frontend forms, and cumbersome multi-repo versioning.

### Decision
Adopt a single monorepo governed by **Turborepo** and **pnpm workspaces**.
* Shared packages: `@bizflow/shared-types`, `@bizflow/validation`, `@bizflow/shared-utils`.
* High-speed incremental caching: Turborepo avoids rebuilding or retesting unchanged packages.
* Strict workspace boundaries: Dependencies between apps and packages are explicitly defined in `package.json`.

### Consequences
* **Positive**: 100% type safety across frontend and backend; updating an API contract or validation schema instantly updates TypeScript checks everywhere.
* **Negative**: Slightly steeper initial repository setup; developer must use pnpm workspace filtering syntax (`pnpm --filter web run dev`).

---

## ADR 002: Modular Monolith vs Microservices for Backend

### Status: Accepted
### Context
As a solo developer building a serious commercial ERP, choosing microservices upfront introduces immense operational complexity (network latency, distributed transactions, saga patterns, multi-service deployment pipelines, and complex local debugging).

### Decision
Adopt a **Modular Monolith** architecture inside **NestJS**.
* Code is strictly divided into domain modules (`AuthModule`, `SalesModule`, `InventoryModule`, `AccountingModule`).
* Communication between domains occurs via exported injectable services or in-memory domain events (`EventEmitter2`).
* Transactions across related domain changes are enclosed in single ACID PostgreSQL transactions (`prisma.$transaction`).

### Consequences
* **Positive**: Rapid solo developer velocity; zero network overhead between modules; guaranteed ACID compliance for financial mutations; easily split into independent microservices later if scaling demands warrant.
* **Negative**: Must enforce code discipline so developers do not bypass module boundaries with direct database cross-joins.

---

## ADR 003: Next.js App Router for Web Frontend

### Status: Accepted
### Context
The web frontend requires high-performance server rendering for initial loads, optimal SEO for public pages, robust layouts for dashboard navigation, and tight integration with modern React 19 / TypeScript paradigms.

### Decision
Use **Next.js (App Router)** with React, TypeScript, and Tailwind CSS.
* App Router provides nested layout structures ideal for ERP interfaces (Persistent Topbar + Dynamic Sidebar + Content Area).
* Client components leverage **TanStack Query** for caching, background revalidation, and optimistic updates.
* **React Hook Form** paired with **Zod** handles high-speed, keyboard-driven form inputs with zero unnecessary re-renders.

### Consequences
* **Positive**: Industry standard, exceptional performance, vast ecosystem of modern UI component primitives.
* **Negative**: Developers must be diligent regarding `'use client'` vs Server Component boundaries.

---

## ADR 004: React Native with Expo for Mobile Applications

### Status: Accepted
### Context
The mobile application must target both Android and iOS devices. The original contemplation considered Flutter, but maintaining dual language stacks (Dart for mobile, TypeScript for web/backend) doubles cognitive load and prevents sharing validation schemas and utility logic.

### Decision
Use **React Native with Expo** (Managed Workflow) and **Expo Router**.
* 100% TypeScript codebase sharing `@bizflow/validation` schemas with the web and backend.
* Native device capabilities (Bluetooth thermal printing, camera barcode scanning, biometric authentication, push notifications) are accessible via high-quality Expo SDK modules.
* Local SQLite storage provides the bedrock for future offline outbox synchronization.

### Consequences
* **Positive**: Unified language stack (TypeScript) across all three platforms; shared domain knowledge and validation logic; rapid solo development.
* **Negative**: Must avoid importing DOM or web-specific libraries into shared packages.

---

## ADR 005: PostgreSQL + Prisma ORM + Multi-Tenant RLS

### Status: Accepted
### Context
Financial ERP systems require strict relational schemas, ACID transactions, complex aggregations, and uncompromising data integrity.

### Decision
Select **PostgreSQL 16+** as the relational database engine, orchestrated by **Prisma ORM**, reinforced with **PostgreSQL Row-Level Security (RLS)**.
* Prisma provides automated migrations, complete TypeScript type generation, and clean schema declaration.
* Multi-tenancy uses a shared schema with `organization_id` on all tenant tables.
* RLS acts as a database-level safety net to guarantee zero cross-tenant data leakage even in the event of an un-scoped application query.

### Consequences
* **Positive**: Rock-solid data integrity, declarative schema management, excellent migration tooling, high developer ergonomics.
* **Negative**: Complex raw analytical SQL queries occasionally require `$queryRaw` when Prisma's query builder is insufficient for deep recursive accounting CTEs.

---

## ADR 006: Decimal Arithmetic (decimal.js) for Financial Values

### Status: Accepted
### Context
Standard JavaScript `Number` types use IEEE 754 double-precision floating-point arithmetic. Operations like `0.1 + 0.2` yield `0.30000000000000004`. In financial and tax software, floating-point rounding errors lead to unbalanced journal entries and tax filing discrepancies.

### Decision
Mandate **`decimal.js`** for all financial, tax, and inventory quantity calculations in both frontend and backend.
* Database columns use `DECIMAL(15, 4)` and `DECIMAL(12, 4)`.
* Prisma deserializes these as `Prisma.Decimal`.
* Any calculation (discounts, GST, round-offs, payment allocations) must pass through `@bizflow/shared-utils/financial-math`.

### Consequences
* **Positive**: 100% exact financial math matching legal accounting and GST standards down to the fourth decimal digit.
* **Negative**: Developers must remember not to use standard arithmetic operators (`+`, `-`, `*`, `/`) directly on financial values.

---

## ADR 007: Outbox Pattern & UUIDv7 for Offline-First Architecture

### Status: Accepted
### Context
Business users in warehouses or retail counters often experience intermittent Wi-Fi or cellular connections. The system must accommodate offline invoice creation and sync when connectivity returns.

### Decision
Implement the **Client Outbox Pattern** utilizing time-sortable **UUIDv7** / **CUID2** IDs.
* Records created offline generate canonical IDs immediately on device.
* Mutations append to an offline SQLite queue (`sync_outbox`).
* Synchronizations are processed idempotently by the backend `/api/v1/sync/push` endpoint.
* Financial transactions enforce strict server-side sequential assignment and conflict rejection upon upload.

### Consequences
* **Positive**: Seamless offline resilience; zero primary key collisions; client can link child line items to parents before server acknowledgement.
* **Negative**: Requires handling conflict scenarios when an entity was modified on the server while the client was offline.

---

## ADR 008: Password Hashing with Argon2id

### Status: Accepted
### Context
Legacy hashing algorithms (MD5, SHA1) and even standard bcrypt are susceptible to specialized GPU/ASIC cracking arrays.

### Decision
Standardize on **Argon2id** (OWASP recommended standard) via the `argon2` Node.js library.
* Configuration: 64MB memory, 3 iterations, 4 parallelism threads.

### Consequences
* **Positive**: Highest resistance to brute-force and side-channel hardware attacks.
* **Negative**: Slightly higher CPU and memory consumption during authentication, safely mitigated with rate limiting.

---

## ADR 009: Redis + BullMQ for Async Jobs & Caching

### Status: Accepted
### Context
Heavy operations like rendering high-resolution PDF invoices, sending bulk emails, and processing large data exports can block the Node.js event loop if executed synchronously inside HTTP request handlers.

### Decision
Deploy **Redis 7+** as an in-memory datastore and task broker powered by **BullMQ**.
* Offloads invoice PDF generation and email dispatch to dedicated background worker processes.
* Provides distributed token blacklisting and high-speed sliding-window rate limiting.

### Consequences
* **Positive**: Near-instant HTTP response times; automated job retries with exponential backoff; system remains responsive under burst traffic.
* **Negative**: Introduces Redis as an infrastructure dependency.
