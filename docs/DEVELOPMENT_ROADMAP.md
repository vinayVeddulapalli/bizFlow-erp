# BizFlow ERP — Comprehensive Development Roadmap

## 1. Development Lifecycle Overview

BizFlow ERP follows a structured 8-phase engineering roadmap designed for a solo developer using Antigravity Premium. Each phase must be fully validated, tested, and approved before commencing the next phase.

```mermaid
flowchart LR
    P0["Phase 0\nArchitecture & Planning"] --> P1["Phase 1\nProject Foundation"]
    P1 --> P2["Phase 2\nSales & Purchase"]
    P2 --> P3["Phase 3\nInventory & Warehouses"]
    P3 --> P4["Phase 4\nAccounting & GST"]
    P4 --> P5["Phase 5\nCRM & HR Payroll"]
    P5 --> P6["Phase 6\nMobile (Expo RN)"]
    P6 --> P7["Phase 7\nProduction Launch"]
```

---

## 2. Phase-by-Phase Execution Plan

### PHASE 0: Architecture and Planning (Current Phase)
* **Goal**: Establish rock-solid architectural blueprints, domain models, database schema, API contracts, security models, and design system before writing functional code.
* **Deliverables**:
  1. `PROJECT_OVERVIEW.md`
  2. `SYSTEM_ARCHITECTURE.md`
  3. `DATABASE_DESIGN.md`
  4. `ENTITY_RELATIONSHIP_DIAGRAM.md`
  5. `API_DESIGN.md`
  6. `SECURITY_PLAN.md`
  7. `UI_UX_GUIDELINES.md`
  8. `DEVELOPMENT_ROADMAP.md`
  9. `TECHNOLOGY_DECISIONS.md`
  10. `PHASE_1_CHECKLIST.md`
  11. `ESTIMATED_COSTS.md`
  12. `DEVELOPMENT_STATUS.md`
* **Exit Criteria**: Developer review and formal sign-off on architecture documents.

---

### PHASE 1: Project Foundation & Core Infrastructure
* **Goal**: Establish the monorepo workspace, spin up local PostgreSQL and Redis containers, configure Prisma ORM, implement Argon2id authentication, multi-tenant organization switching, and the web shell with dashboard aggregates.
* **Deliverables**:
  - Turborepo & pnpm workspace initialization (`apps/web`, `apps/api`, `packages/shared-types`, `packages/validation`, `packages/shared-utils`).
  - Docker Compose for PostgreSQL 16, Redis 7, and MinIO.
  - NestJS modular API setup with global error handling, logging, and validation pipes.
  - Prisma migrations for Tenancy, IAM, Users, Roles, and Organizations.
  - Complete Authentication API: Register, Login, Refresh Token rotation, Logout, Password Reset.
  - Organization and Branch Management APIs (Create, List, Switch Context).
  - Next.js Web App: Landing, Login/Register forms, Dashboard layout, Persistent Topbar with Org Switcher, Active Branch Pill.
  - Executive Dashboard Shell connected to live database aggregate queries.
* **Exit Criteria**: A user can register, create a business organization, invite a team member, switch organizations, and view the dashboard shell with zero TypeScript or console errors.

---

### PHASE 2: Sales, Purchase & Billing Subsystems
* **Goal**: Deliver end-to-end commercial transactional workflows for sales and procurement with server-side numbering, PDF generation, and payment allocations.
* **Deliverables**:
  - Customer and Supplier Master directory management (GSTIN validation, state codes, addresses, credit limits).
  - Quotation / Proforma Invoice workflow with one-click conversion to Sales Invoice.
  - Sales Invoicing Engine: Draft creation, line-item tax calculations (CGST/SGST/IGST), server-side sequential numbering (`INV-YYYY-XXXXX`).
  - Invoice Finalization (`POST /sales/invoices/:id/post`) with transaction locks.
  - Supplier Purchase Order & Purchase Bill (GRN) workflow.
  - Payment Receipts and Supplier Payment Vouchers with multi-invoice allocation logic.
  - Credit Notes and Debit Notes for sales/purchase returns.
  - Server-side PDF invoice rendering engine with QR code generation.
* **Exit Criteria**: Full commercial cycle can be executed: Create Customer -> Issue Quotation -> Convert to Invoice -> Finalize Invoice -> Issue PDF -> Record Partial Payment -> Verify Outstanding Balance.

---

### PHASE 3: Inventory Management & Multi-Warehouse Operations
* **Goal**: Implement stock control, multi-warehouse allocations, barcode scanning, stock movements, and inventory valuation.
* **Deliverables**:
  - Product Catalog (Goods vs Services, HSN/SAC codes, UOMs, Barcodes, Categories).
  - Multi-Warehouse configuration per branch.
  - Automated Stock Ledger: Stock In on Purchase Bill Post, Stock Out on Sales Invoice Post.
  - Warehouse-to-Warehouse Stock Transfer slips.
  - Physical Stock Adjustment vouchers (shrinkage, damage, surplus).
  - Low-stock alerts and reorder level notification widgets on the dashboard.
  - Real-time stock valuation reports (Weighted Average Costing).
* **Exit Criteria**: Posting sales and purchase invoices updates stock levels accurately across warehouses; physical adjustments generate auditable stock movement logs.

---

### PHASE 4: Double-Entry Accounting & Indian GST Compliance
* **Goal**: Unify financial integrity with automated double-entry ledger posting, standard financial statements, and Indian GST filing preparations.
* **Deliverables**:
  - Standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses) seeded on organization creation.
  - Automatic Journal Entry creation upon posting Sales Invoices, Purchase Bills, and Payment Vouchers.
  - Manual Journal Vouchers with strict validation (`Debit Total == Credit Total`).
  - General Ledger and Party Account Statements.
  - Real-time financial reports: Trial Balance, Profit & Loss Statement, Balance Sheet, Cash Flow.
  - Indian GST Engine: Automatic Place of Supply determination (Intra-state CGST+SGST vs Inter-state IGST).
  - GSTR-1 outward supplies export (B2B, B2CL, B2CS tables) and GSTR-3B monthly tax computation.
* **Exit Criteria**: Every invoice post creates a verified balanced journal entry; Trial Balance balances to zero; GST reports match tax line totals accurately.

---

### PHASE 5: Advanced ERP (CRM, HR & Payroll, Advanced Analytics)
* **Goal**: Extend platform capabilities to sales pipeline tracking, human resources, and business intelligence.
* **Deliverables**:
  - CRM: Lead capture, visual Kanban opportunity pipeline, follow-up scheduling, conversion to customer.
  - HR: Employee directory, department & designation hierarchies, daily attendance logging, leave approvals.
  - Payroll: Salary structure setup (Basic, HRA, Allowances, PF, ESI, TDS deductions), monthly payroll processing runs, automatic salary expense journal entries, PDF payslips.
  - Advanced Analytics: Customer aging analysis, product sales velocity, margin analysis, and Excel/CSV export engine.
* **Exit Criteria**: HR manager can run payroll and disburse payslips; CRM leads can convert to paying customers with complete audit trails.

---

### PHASE 6: Cross-Platform Mobile Applications (React Native + Expo)
* **Goal**: Develop and deploy high-performance Android and iOS apps with local SQLite storage and offline-first synchronization.
* **Deliverables**:
  - Expo Router app setup in `apps/mobile`.
  - Secure authentication via Expo SecureStore and biometric unlock.
  - Mobile Executive Dashboard with live KPI widgets.
  - Mobile Sales: Fast counter billing, customer lookup, thermal receipt printing via Bluetooth.
  - Mobile Inventory: Barcode camera scanning for stock lookup and physical counts.
  - Offline Engine: SQLite local store, outbox queue, background sync on network reconnection, conflict handling.
* **Exit Criteria**: Mobile user can create an invoice while in airplane mode; upon reconnecting, the invoice syncs to the server, receives a sequential number, and updates inventory.

---

### PHASE 7: Production Readiness, Security Auditing & Deployment
* **Goal**: Harden system security, optimize database queries, perform stress testing, configure CI/CD pipelines, and deploy to production infrastructure.
* **Deliverables**:
  - End-to-end automated testing suite (Jest backend tests, Playwright web E2E tests).
  - Rigorous financial precision tests (rounding edge cases, partial payment allocations).
  - Penetration testing & security audit (OWASP compliance, RLS verification, rate limit stress testing).
  - Production Docker setup with Nginx reverse proxy, SSL termination, and automated daily PostgreSQL backups.
  - Centralized monitoring, logging, and error tracking (Sentry + structured Winston logs).
  - Deployment runbooks, disaster recovery procedures, and user manual documentation.
* **Exit Criteria**: 100% test pass rate; zero critical security vulnerabilities; sub-100ms API response time at p95; successful disaster recovery restoration test.

---

## 3. Vyapar Extended Feature Coverage & Architecture Integration

To achieve broad commercial feature parity with Vyapar while providing superior ERP capabilities, BizFlow ERP incorporates the following extended business modules across the execution phases.

### 3.1 Module Mapping to Phases

```mermaid
flowchart TD
    subgraph Core_Billing_Inventory["Core Commercial Engine (Prioritized First)"]
        A_POS["A. POS & Retail Counter Billing\n(Barcode, Thermal, Split Pay)"]
        B_Exp["B. Expenses & Other Income\n(GST/Non-GST, Recurring)"]
        C_AdvSales["C. Advanced Sales & Purchase\n(Orders, Challans, Notes, Aging)"]
        D_AdvInv["D. Advanced Inventory\n(Batches, Serials, MRP, Dual Units)"]
        E_CashBank["E. Cash, Bank & Loans\n(Cheques, Passbook, Loans, EMI)"]
        F_Templates["F. Invoice Customization & Printing\n(Thermal, A4/A5, Dynamic Prefix)"]
    end

    subgraph Operations_Growth["Commercial Operations & Digital Sales (Phased Next)"]
        G_Store["G. Online Store & Ordering\n(Public Catalog, Web Orders)"]
        J_Ops["J. Advanced Operations\n(Salesmen, GPS Readiness, Branch BI)"]
        I_Data["I. Data Portability & Tools\n(Excel/Tally Import-Export, OCR)"]
    end

    subgraph Integrations["Optional External Integrations (Subject to Cost Approval)"]
        H_Comm["H. Communication & Alerts\n(WhatsApp Cloud, SMS DLT, Payment QR)"]
    end

    D_AdvInv --> A_POS
    F_Templates --> A_POS
    E_CashBank --> A_POS
    C_AdvSales --> B_Exp
    C_AdvSales --> E_CashBank
    Core_Billing_Inventory --> G_Store
    Core_Billing_Inventory --> J_Ops
    Core_Billing_Inventory --> I_Data
    Core_Billing_Inventory -.-> H_Comm
```

| Module Category | Scope & Key Capabilities | Phase Placement | Core vs External |
| :--- | :--- | :--- | :--- |
| **A. POS & Retail Billing** | Counter billing, barcode scan/gen, QR, thermal printing (ESC/POS), weighing scale readiness, cash register, multi-mode split pay. | **Phase 2.1** | **Core In-House** |
| **B. Expense & Income** | Expense/income categories, GST & non-GST expense vouchers, recurring expenses, automated P&L reflection. | **Phase 4.1** | **Core In-House** |
| **C. Advanced Sales & Purchase** | Proforma invoices, Sales Orders, Purchase Orders, Delivery Challans, Credit/Debit notes, partial pay, aging & due dates. | **Phase 2.2** | **Core In-House** |
| **D. Advanced Inventory** | Batch tracking with Mfg/Expiry, Serial tracking, MRP management, primary/secondary dual units, price matrix, free quantities. | **Phase 3.1** | **Core In-House** |
| **E. Cash, Bank & Loans** | Multiple bank ledgers, cash-in-hand register, cheque clearance, bank reconciliation, loan accounts & EMI schedules. | **Phase 4.2** | **Core In-House** |
| **F. Invoice Customization** | Dynamic prefixes, custom templates (Modern, Classic, Minimal), A4/A5/Thermal formats, custom fields, PDF engine. | **Phase 2.3** | **Core In-House** |
| **G. Online Store** | Public digital product catalog, customer mobile/web ordering, catalog pricing, one-click order-to-invoice conversion. | **Phase 5.1** | **Core In-House** |
| **H. Communication & Reminders** | In-app notification queue & webhooks. External WhatsApp Cloud API, SMS (DLT), and payment gateway dynamic UPI QR. | **Phase 5.2** | **External Paid (Gated)** |
| **I. Data Import/Export & Backup** | Excel & CSV import/export, Tally XML import/export, automated database dump/restore. OCR purchase scanning. | **Phase 7.1** | **Core + Optional OCR** |
| **J. Advanced Operations** | Salesman commission tracking, salesperson sales analytics, branch-wise comparative reports, GPS field tracking schema. | **Phase 5.3** | **Core + Optional GPS** |

---

### 3.2 Inter-Module Dependency Matrix

1. **POS Billing (A)** depends on:
   - **Product Master & Barcode/Batch (D)**: For item pricing, barcodes, and inventory deduction.
   - **Cash & Bank (E)**: For register float reconciliation and tender deposits.
   - **Invoice Customization (F)**: For thermal ESC/POS receipt generation.
2. **Advanced Sales & Purchase (C)** depends on:
   - **Dual Units & Batches (D)**: For unit conversion and batch allocation during order fulfillment.
   - **Double-Entry Accounting (Phase 4)**: For automated AP/AR, Credit/Debit note postings.
3. **Cash, Bank & Loans (E)** depends on:
   - **Double-Entry General Ledger (Phase 4)**: For contra entries, bank reconciliation, and interest amortization.
4. **Online Store (G)** depends on:
   - **Product Catalog (D)**: For public listing, real-time stock availability, and MRP.
   - **Sales Invoicing (Phase 2)**: For converting customer web orders into posted tax invoices.
5. **Communication & Reminders (H)** depends on:
   - **Invoice & Due Date Engine (C)**: For payment reminder triggers and outstanding balance notifications.

---

### 3.3 Core In-House vs External Paid Integrations Boundary

To keep development frugal and independent of recurring monthly SaaS subscriptions:
* **Strict Core Boundary (100% In-House, Zero Per-Transaction Cost)**:
  - Thermal ESC/POS receipt rendering (raw ESC/POS byte streams).
  - Barcode & QR code generation (`bwip-js` / `qrcode` node packages).
  - Bank transaction management and reconciliation logic.
  - A4, A5, and 80mm/58mm PDF generation.
  - Batch, Serial, MRP, and Dual-unit math.
  - Excel/CSV bulk import and export parsers.
  - Public online ordering web portal.
* **External Integration Boundary (Requires Specific Setup, Cost Identification & User Approval)**:
  - **WhatsApp Cloud API**: Requires Meta Business verification and per-template conversation fees.
  - **SMS Messaging**: Requires Indian DLT registration (TRAI entity registration) and SMS gateway credits.
  - **UPI Dynamic QR / Payment Gateway**: Requires merchant account credentials (Razorpay / Cashfree / Pine Labs).
  - **OCR Bill Scanning**: Requires cloud OCR document parsers (AWS Textract / Google Document AI).
  - **GPS Live Tracking**: Requires Google Maps Geolocation / Distance Matrix API billing.

*Rule: External paid integrations will never be enabled without prior explicit approval and verified sandbox testing.*
