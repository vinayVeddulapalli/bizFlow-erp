# BizFlow ERP — Enterprise Business Management Platform

> A modern, scalable, production-grade ERP platform designed for small and medium-sized enterprises with multi-company, multi-branch, and multi-warehouse capabilities.

---

## Architecture & Planning Documentation (Phase 0)

All comprehensive architectural specifications have been prepared and are located in the [`docs/`](./docs) folder:

1. [**Project Overview**](./docs/PROJECT_OVERVIEW.md) — Strategic vision, module scope, market positioning, and core objectives.
2. [**System Architecture**](./docs/SYSTEM_ARCHITECTURE.md) — Monorepo topology, NestJS modular monolith, async worker strategy, and offline-first synchronization flow.
3. [**Database Design**](./docs/DATABASE_DESIGN.md) — Multi-tenant schema design, PostgreSQL Row-Level Security, decimal standards, and Prisma blueprints.
4. [**Entity Relationship Diagram**](./docs/ENTITY_RELATIONSHIP_DIAGRAM.md) — Complete visual Mermaid ER diagrams across Tenancy, Inventory, Sales, and Double-entry Ledger.
5. [**API Design**](./docs/API_DESIGN.md) — REST conventions, envelope formats, error handling (RFC 7807), and full endpoint catalog.
6. [**Security Plan**](./docs/SECURITY_PLAN.md) — Argon2id password hashing, JWT family rotation, 3-layer tenant isolation, and OWASP Top 10 threat model.
7. [**UI/UX Guidelines**](./docs/UI_UX_GUIDELINES.md) — BizFlow brand identity, color system, tabular numeric alignment, and high-speed keyboard shortcuts.
8. [**Development Roadmap**](./docs/DEVELOPMENT_ROADMAP.md) — Detailed 8-phase execution roadmap from Foundation to Production Launch.
9. [**Technology Decisions (ADRs)**](./docs/TECHNOLOGY_DECISIONS.md) — 9 formal Architecture Decision Records covering monorepo, framework, database, offline, and security choices.
10. [**Phase 1 Checklist**](./docs/PHASE_1_CHECKLIST.md) — Step-by-step actionable implementation checklist for Phase 1.
11. [**Estimated Costs**](./docs/ESTIMATED_COSTS.md) — Frugal cloud cost projections from $0 local development to affordable live production tiers.
12. [**Development Status**](./docs/DEVELOPMENT_STATUS.md) — Live project tracker, completed milestones, pending tasks, and decision log.

---

## Technology Stack

* **Web Application**: Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod.
* **Backend API**: NestJS (Modular Monolith), TypeScript, REST Architecture, Swagger/OpenAPI.
* **Database & ORM**: PostgreSQL 16+, Prisma ORM, Row-Level Security (RLS).
* **Caching & Queues**: Redis 7+, BullMQ.
* **Object Storage**: S3-compatible (MinIO for local dev, Cloudflare R2 / AWS S3 for production).
* **Mobile (Phase 6)**: React Native with Expo, Expo Router, SQLite (Offline Outbox).
