# BizFlow ERP — Project Overview

## 1. Executive Summary

**BizFlow ERP** is an enterprise-grade, multi-tenant Business Management and Enterprise Resource Planning (ERP) platform architected for small to medium enterprises (SMBs) with the structural capability to scale seamlessly to mid-market and large multi-branch organizations.

Inspired by the workflow agility and operational intuitiveness of modern business platforms like Vyapar, Zoho, and Odoo, BizFlow ERP unifies sales, procurement, multi-warehouse inventory, double-entry financial accounting, Indian Goods and Services Tax (GST) compliance, customer relationship management (CRM), and human resources into a single cohesive, high-performance platform.

The system is constructed with a **modular monolith backend** (NestJS + PostgreSQL), a **modern web application** (Next.js App Router + TypeScript + Tailwind CSS), and future **cross-platform mobile applications** (React Native + Expo), underpinned by an offline-ready architectural blueprint.

---

## 2. Strategic Vision & Core Objectives

### 2.1 Strategic Pillars
1. **Financial Exactness & Anti-Tamper Auditing**: Absolute data integrity using fixed-point decimal arithmetic, double-entry journal balancing, server-authoritative invoice numbering, and immutable audit logs.
2. **True Multi-Tenancy with Zero Data Leakage**: Hardware-efficient shared-database/shared-schema architecture reinforced by organization-level isolation guards, contextual middleware, and PostgreSQL Row-Level Security (RLS).
3. **Indian Taxation Native (GST-First)**: Complete compliance with CGST, SGST, IGST, HSN/SAC codes, reverse charge mechanism (RCM), tax-inclusive/exclusive pricing, GSTR-1 and GSTR-3B reporting, and future e-Invoicing/e-Way Bill readiness.
4. **Unified Platform Experience**: Synchronized business operations across Web (Next.js) and Mobile (React Native Expo), sharing core domain validation rules and API contracts.
5. **Offline-Resilient Foundation**: Architectural anticipation of intermittent internet connectivity via client outbox patterns, unique operation tracking (UUIDv7/CUID2), and conflict detection protocols.

---

## 3. Target Audience & Market Positioning

| Customer Segment | Typical Profile | Primary Value Received |
| :--- | :--- | :--- |
| **Wholesalers & Distributors** | High volume of sales/purchase orders, complex credit terms, multi-warehouse stock movement. | Fast batch/barcode scanning, warehouse transfer slips, customer credit limits, aging receivables tracking. |
| **Retailers & Traders** | High counter transactions, barcode billing, GST invoices, inventory reorder triggers. | Instant POS/invoice generation, thermal printer support, low-stock alerts, fast cash/UPI reconciliation. |
| **Service Providers & Freelance Agencies** | Time/service billing, quotation-to-invoice flows, expense tracking. | SAC code support, professional PDF quotations, milestone payments, P&L visibility. |
| **Small Manufacturers / Assemblers** | Raw material purchase, stock adjustments, conversion to finished goods. | Multiple warehouse stock valuation (FIFO/Weighted Average), batch tracking, supplier debit notes. |

---

## 4. Comprehensive Module Scope

```
+---------------------------------------------------------------------------------------+
|                                    BIZFLOW ERP CORE                                   |
+---------------------------------------------------------------------------------------+
|  [01] Identity & Tenancy   | Multi-org, Branches, RBAC, Users, Session & Audit Logs   |
|  [02] Executive Dashboard  | Real-time KPIs, Cashflow, Receivables, Payables, Trends   |
|  [03] Sales Management     | Quotation -> Order -> Invoice -> Payment -> Credit Note   |
|  [04] Purchase Management  | Supplier PO -> Bill -> Payment -> Debit Note             |
|  [05] Inventory Management | Multi-Warehouse, Stock Movements, Adjustments, Valuations|
|  [06] Finance & Accounting | Double-entry, Chart of Accounts, Journals, Ledger, P&L, BS|
|  [07] GST & Indian Tax     | CGST/SGST/IGST, HSN/SAC, GSTR-1 & GSTR-3B Data Engine    |
|  [08] CRM & Pipeline       | Leads, Opportunities, Stage Funnels, Customer Follow-ups |
|  [09] HR & Payroll         | Employees, Attendance, Leaves, Salary Structures, Slips  |
|  [10] Reports & Analytics  | Financial, Operational, Inventory, Tax Reports (PDF/XLSX)|
+---------------------------------------------------------------------------------------+
```

### Module Breakdown
* **Module 1: Foundation & Authentication**: Organization creation, branch hierarchies, Argon2id credentials, JWT tokens with refresh rotation, role-based permission matrices, activity audit logging.
* **Module 2: Dashboard**: Aggregated financial metrics computed directly from database records, interactive charts, liquidity tracking, low-stock warnings, and recent transaction feeds.
* **Module 3: Sales Management**: Customer directories, tiered pricing, quotation lifecycle, proforma invoices, tax invoices, delivery challans, receipt vouchers, customer ledger, PDF generation with QR codes.
* **Module 4: Purchase Management**: Vendor directories, purchase orders, goods received notes (GRN), purchase bills, supplier payment vouchers, vendor aging schedules.
* **Module 5: Inventory Management**: Item master (goods & services), category trees, UOMs, multi-warehouse stock allocations, stock transfer vouchers, automated stock valuation (weighted average/FIFO), batch and serial tracking.
* **Module 6: Finance & Accounting**: Standardized Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses), automated balancing journal creation upon invoice posting, bank/cash reconciliation, trial balance, balance sheet, profit & loss, cash flow statement.
* **Module 7: GST & Taxation**: Automatic intra-state (CGST + SGST) vs inter-state (IGST) tax calculation based on Place of Supply, reverse charge handling, item-level HSN/SAC mapping, GSTR JSON/tabular exports.
* **Module 8: CRM**: Lead capture, pipeline tracking with Kanban board, interaction history, conversion to customer with zero data duplication.
* **Module 9: HR & Payroll**: Employee directory, department structure, basic attendance logging, leave balances, monthly payroll processing, automated salary journal entries, and PDF payslips.
* **Module 10: Reports & Analytics**: Over 30 standard financial, commercial, and operational reports with date filters, warehouse slices, and export to PDF and Excel.

---

## 5. High-Level Architectural Principles

1. **Separation of Concerns**: Strict boundary enforcement between presentation layers (Next.js web & Expo mobile), application service layer (NestJS), and storage persistence layer (PostgreSQL via Prisma).
2. **Zero-Trust Multi-Tenancy**: Every database transaction is scoped to a validated `organization_id`. Frontend-provided tenant IDs are never trusted blindly; they are resolved and verified against the user's active session.
3. **Server-Authoritative Financial Engine**: Financial numbers, discounts, taxes, round-offs, and stock adjustments are computed exclusively on the backend. Frontend calculations are strictly for immediate UI feedback.
4. **Idempotent Operations**: All mutating financial requests (invoice creation, payment processing, stock adjustments) accept a client-generated `Idempotency-Key` to eliminate duplicate entries caused by network retries.
5. **Auditable & Non-Destructive**: Posted financial records cannot be mutated or deleted. Corrections must be handled through formal reversal entries (credit notes, debit notes, cancellation vouchers) to preserve legal and audit compliance.
