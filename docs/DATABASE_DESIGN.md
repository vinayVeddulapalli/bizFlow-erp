# BizFlow ERP — Database Design & Schema Architecture

## 1. Core Database Principles & Standards

### 1.1 Multi-Tenant Tenancy Model
BizFlow ERP uses a **Shared Database, Shared Schema with Row-Level Tenant Isolation** architecture. This provides the optimal balance of cost-efficiency, automated migration management, and low infrastructure overhead for a solo developer while guaranteeing absolute tenant data isolation.

* **Every tenant-scoped table** includes an immutable `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
* **Tenant Scoping via Prisma Extension**: Every Prisma client query automatically injects `where: { organizationId: context.orgId }`.
* **PostgreSQL Row-Level Security (RLS)**: Enforced as a defense-in-depth safety net. The backend sets `SET LOCAL app.current_org_id = '...'` at the start of database sessions or transaction blocks.

### 1.2 Monetary & Numerical Exactness Standards
* **Never use FLOAT or DOUBLE PRECISION** for monetary values. Floating point arithmetic causes rounding discrepancies that violate accounting law.
* **Monetary Values**: Stored as `DECIMAL(15, 4)` or `NUMERIC(15, 4)`. This accommodates up to 99,999,999,999.9999 (99 billion with 4 decimal places for fraction-of-cent tax calculations).
* **Quantities**: Stored as `DECIMAL(12, 4)` to support fractional units of measurement (e.g., 1.250 kg, 45.75 meters).
* **Tax Percentages**: Stored as `DECIMAL(5, 2)` (e.g., 18.00%, 0.25%, 5.00%).

### 1.3 Audit & Immutability Rules
* **Financial Immutability**: Tables representing finalized financial transactions (`journal_entries`, `journal_entry_lines`, `posted_invoices`) are strictly **append-only**. Deletions or updates to posted records are prohibited at the database constraint level. Adjustments require explicit reversal records.
* **Soft Deletes**: Non-financial master records (e.g., `customers`, `products`, `warehouses`) use `deleted_at TIMESTAMPTZ NULL`. Unique constraints on names or codes are scoped with `WHERE deleted_at IS NULL`.
* **Audit Metadata**: Every table contains `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `created_by UUID REFERENCES users(id)`, and `updated_by UUID REFERENCES users(id)`.

---

## 2. PostgreSQL Row-Level Security (RLS) Implementation

```sql
-- Enable RLS on all tenant-aware tables
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policy
CREATE POLICY tenant_isolation_policy ON sales_invoices
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::UUID);
```

When an API request initiates a database operation:
```typescript
await prisma.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${currentTenantId}'`);
```

---

## 3. Database Schema Blueprint (Prisma Schema Segmented Breakdown)

### 3.1 Tenancy, Users, and Permissions

```prisma
model User {
  id                   String               @id @default(uuid()) @db.Uuid
  email                String               @unique @db.VarChar(255)
  passwordHash         String               @map("password_hash") @db.VarChar(255)
  fullName             String               @map("full_name") @db.VarChar(150)
  phoneNumber          String?              @map("phone_number") @db.VarChar(20)
  isEmailVerified      Boolean              @default(false) @map("is_email_verified")
  isActive             Boolean              @default(true) @map("is_active")
  avatarUrl            String?              @map("avatar_url") @db.VarChar(500)
  createdAt            DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  memberships          OrganizationMember[]
  auditLogs            AuditLog[]

  @@map("users")
}

model Organization {
  id                   String               @id @default(uuid()) @db.Uuid
  name                 String               @db.VarChar(200)
  legalName            String?              @map("legal_name") @db.VarChar(250)
  gstin                String?              @db.VarChar(15) // Indian GST 15-digit ID
  pan                  String?              @db.VarChar(10) // Indian PAN
  currencyCode         String               @default("INR") @map("currency_code") @db.VarChar(3)
  fiscalYearStartMonth Int                  @default(4) @map("fiscal_year_start_month") // April for India
  logoUrl              String?              @map("logo_url") @db.VarChar(500)
  createdAt            DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  members              OrganizationMember[]
  branches             Branch[]
  warehouses           Warehouse[]
  customers            Customer[]
  suppliers            Supplier[]
  products             Product[]
  salesInvoices        SalesInvoice[]
  purchaseInvoices     PurchaseInvoice[]
  accounts             Account[]
  journalEntries       JournalEntry[]
  auditLogs            AuditLog[]

  @@index([gstin])
  @@map("organizations")
}

model OrganizationMember {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  roleId         String       @map("role_id") @db.Uuid
  isDefault      Boolean      @default(false) @map("is_default")
  joinedAt       DateTime     @default(now()) @map("joined_at") @db.Timestamptz

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           Role         @relation(fields: [roleId], references: [id])

  @@unique([organizationId, userId])
  @@map("organization_members")
}

model Role {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String?      @map("organization_id") @db.Uuid // null = system preset role
  name           String       @db.VarChar(100) // Admin, Manager, Accountant, Sales Rep
  description    String?      @db.VarChar(255)
  isSystem       Boolean      @default(false) @map("is_system")
  permissions    String[]     @db.VarChar(100) // e.g. ["sales.read", "sales.write", "accounting.post"]

  members        OrganizationMember[]

  @@map("roles")
}

model Branch {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  name           String       @db.VarChar(150)
  code           String       @db.VarChar(20)
  gstin          String?      @db.VarChar(15) // State-specific GSTIN
  addressLine1   String       @map("address_line1") @db.VarChar(255)
  city           String       @db.VarChar(100)
  state          String       @db.VarChar(100)
  stateCode      String       @map("state_code") @db.VarChar(2) // 2-digit Indian State Code
  postalCode     String       @map("postal_code") @db.VarChar(10)
  isMainBranch   Boolean      @default(false) @map("is_main_branch")
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  warehouses     Warehouse[]

  @@unique([organizationId, code])
  @@map("branches")
}
```

---

### 3.2 Master Catalog & Inventory Management

```prisma
model ProductCategory {
  id             String            @id @default(uuid()) @db.Uuid
  organizationId String            @map("organization_id") @db.Uuid
  name           String            @db.VarChar(150)
  parentId       String?           @map("parent_id") @db.Uuid
  createdAt      DateTime          @default(now()) @map("created_at") @db.Timestamptz

  parent         ProductCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children       ProductCategory[] @relation("CategoryHierarchy")
  products       Product[]

  @@map("product_categories")
}

model UnitOfMeasurement {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  name           String       @db.VarChar(50) // Pieces, Kilograms, Meters
  code           String       @db.VarChar(10) // PCS, KGS, MTR (UQC standard for GST)

  products       Product[]

  @@map("units_of_measurement")
}

enum ItemType {
  GOODS
  SERVICE
}

model Product {
  id             String            @id @default(uuid()) @db.Uuid
  organizationId String            @map("organization_id") @db.Uuid
  type           ItemType          @default(GOODS)
  name           String            @db.VarChar(200)
  sku            String?           @db.VarChar(100)
  barcode        String?           @db.VarChar(100)
  hsnSacCode     String?           @map("hsn_sac_code") @db.VarChar(10) // 4 to 8 digit HSN/SAC
  categoryId     String?           @map("category_id") @db.Uuid
  uomId          String?           @map("uom_id") @db.Uuid
  
  // Pricing & Taxation
  sellingPrice   Decimal           @default(0) @map("selling_price") @db.Decimal(15, 4)
  purchasePrice  Decimal           @default(0) @map("purchase_price") @db.Decimal(15, 4)
  taxRate        Decimal           @default(0) @map("tax_rate") @db.Decimal(5, 2) // 0, 5, 12, 18, 28
  isTaxInclusive Boolean           @default(false) @map("is_tax_inclusive")

  // Inventory Thresholds
  minStockLevel  Decimal           @default(0) @map("min_stock_level") @db.Decimal(12, 4)
  reorderPoint   Decimal           @default(0) @map("reorder_point") @db.Decimal(12, 4)
  
  isActive       Boolean           @default(true) @map("is_active")
  deletedAt      DateTime?         @map("deleted_at") @db.Timestamptz

  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  category       ProductCategory?  @relation(fields: [categoryId], references: [id])
  uom            UnitOfMeasurement? @relation(fields: [uomId], references: [id])
  stockLevels    StockLevel[]
  stockMovements StockMovement[]

  @@unique([organizationId, sku])
  @@index([organizationId, barcode])
  @@map("products")
}

model Warehouse {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  name           String          @db.VarChar(150)
  code           String          @db.VarChar(20)
  isDefault      Boolean         @default(false) @map("is_default")

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  branch         Branch          @relation(fields: [branchId], references: [id])
  stockLevels    StockLevel[]
  stockMovements StockMovement[]

  @@unique([organizationId, code])
  @@map("warehouses")
}

model StockLevel {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  warehouseId    String          @map("warehouse_id") @db.Uuid
  quantity       Decimal         @default(0) @db.Decimal(12, 4)
  updatedAt      DateTime        @updatedAt @map("updated_at") @db.Timestamptz

  product        Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse      Warehouse       @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@unique([organizationId, productId, warehouseId])
  @@map("stock_levels")
}

enum MovementType {
  SALES_INVOICE
  SALES_RETURN
  PURCHASE_RECEIPT
  PURCHASE_RETURN
  TRANSFER_IN
  TRANSFER_OUT
  STOCK_ADJUSTMENT
  OPENING_STOCK
}

model StockMovement {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  warehouseId    String          @map("warehouse_id") @db.Uuid
  movementType   MovementType    @map("movement_type")
  quantity       Decimal         @db.Decimal(12, 4) // Positive for IN, Negative for OUT
  unitCost       Decimal         @map("unit_cost") @db.Decimal(15, 4)
  referenceType  String?         @map("reference_type") @db.VarChar(50) // e.g. "sales_invoice"
  referenceId    String?         @map("reference_id") @db.Uuid
  notes          String?         @db.VarChar(255)
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product        Product         @relation(fields: [productId], references: [id])
  warehouse      Warehouse       @relation(fields: [warehouseId], references: [id])

  @@index([organizationId, productId, warehouseId])
  @@map("stock_movements")
}
```

---

### 3.3 Sales & Accounts Receivable

```prisma
enum PartyType {
  UNREGISTERED
  REGULAR
  COMPOSITION
  CONSUMER
  OVERSEAS
}

model Customer {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  name           String          @db.VarChar(200)
  companyName    String?         @map("company_name") @db.VarChar(200)
  email          String?         @db.VarChar(255)
  phone          String?         @db.VarChar(20)
  gstin          String?         @db.VarChar(15)
  partyType      PartyType       @default(UNREGISTERED) @map("party_type")
  state          String          @db.VarChar(100)
  stateCode      String          @map("state_code") @db.VarChar(2)
  billingAddress String          @map("billing_address") @db.Text
  shippingAddress String?        @map("shipping_address") @db.Text
  creditLimit    Decimal         @default(0) @map("credit_limit") @db.Decimal(15, 4)
  currentBalance Decimal         @default(0) @map("current_balance") @db.Decimal(15, 4)
  isActive       Boolean         @default(true) @map("is_active")
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  salesInvoices  SalesInvoice[]
  paymentReceipts PaymentReceipt[]

  @@map("customers")
}

enum InvoiceStatus {
  DRAFT
  POSTED
  PARTIALLY_PAID
  PAID
  CANCELLED
}

model SalesInvoice {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  customerId     String          @map("customer_id") @db.Uuid
  invoiceNumber  String          @map("invoice_number") @db.VarChar(50) // Sequential per org/fiscal year
  invoiceDate    DateTime        @map("invoice_date") @db.Date
  dueDate        DateTime        @map("due_date") @db.Date
  status         InvoiceStatus   @default(DRAFT)
  
  // Tax & Financial Summaries
  subtotalAmount Decimal         @default(0) @map("subtotal_amount") @db.Decimal(15, 4)
  discountAmount Decimal         @default(0) @map("discount_amount") @db.Decimal(15, 4)
  cgstAmount     Decimal         @default(0) @map("cgst_amount") @db.Decimal(15, 4)
  sgstAmount     Decimal         @default(0) @map("sgst_amount") @db.Decimal(15, 4)
  igstAmount     Decimal         @default(0) @map("igst_amount") @db.Decimal(15, 4)
  totalTaxAmount Decimal         @default(0) @map("total_tax_amount") @db.Decimal(15, 4)
  roundOffAmount Decimal         @default(0) @map("round_off_amount") @db.Decimal(15, 4)
  totalAmount    Decimal         @default(0) @map("total_amount") @db.Decimal(15, 4)
  paidAmount     Decimal         @default(0) @map("paid_amount") @db.Decimal(15, 4)
  dueAmount      Decimal         @default(0) @map("due_amount") @db.Decimal(15, 4)

  placeOfSupply  String          @map("place_of_supply") @db.VarChar(2) // 2-digit Indian State Code
  notes          String?         @db.Text
  terms          String?         @db.Text
  postedAt       DateTime?       @map("posted_at") @db.Timestamptz
  version        Int             @default(1) // For optimistic locking & offline sync

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer       Customer        @relation(fields: [customerId], references: [id])
  items          SalesInvoiceItem[]
  payments       PaymentReceiptAllocation[]

  @@unique([organizationId, invoiceNumber])
  @@index([organizationId, customerId, invoiceDate])
  @@map("sales_invoices")
}

model SalesInvoiceItem {
  id             String          @id @default(uuid()) @db.Uuid
  invoiceId      String          @map("invoice_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  warehouseId    String          @map("warehouse_id") @db.Uuid
  description    String?         @db.VarChar(255)
  hsnSacCode     String?         @map("hsn_sac_code") @db.VarChar(10)
  quantity       Decimal         @db.Decimal(12, 4)
  unitPrice      Decimal         @map("unit_price") @db.Decimal(15, 4)
  discountPct    Decimal         @default(0) @map("discount_pct") @db.Decimal(5, 2)
  discountAmount Decimal         @default(0) @map("discount_amount") @db.Decimal(15, 4)
  taxableAmount  Decimal         @map("taxable_amount") @db.Decimal(15, 4)
  taxRate        Decimal         @map("tax_rate") @db.Decimal(5, 2)
  cgstAmount     Decimal         @default(0) @map("cgst_amount") @db.Decimal(15, 4)
  sgstAmount     Decimal         @default(0) @map("sgst_amount") @db.Decimal(15, 4)
  igstAmount     Decimal         @default(0) @map("igst_amount") @db.Decimal(15, 4)
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)

  invoice        SalesInvoice    @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product        Product         @relation(fields: [productId], references: [id])

  @@map("sales_invoice_items")
}

model PaymentReceipt {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  customerId     String          @map("customer_id") @db.Uuid
  receiptNumber  String          @map("receipt_number") @db.VarChar(50)
  paymentDate    DateTime        @map("payment_date") @db.Date
  paymentMode    String          @map("payment_mode") @db.VarChar(50) // CASH, BANK_TRANSFER, UPI, CHEQUE
  amount         Decimal         @db.Decimal(15, 4)
  referenceNo    String?         @map("reference_no") @db.VarChar(100)
  notes          String?         @db.VarChar(255)

  customer       Customer        @relation(fields: [customerId], references: [id])
  allocations    PaymentReceiptAllocation[]

  @@unique([organizationId, receiptNumber])
  @@map("payment_receipts")
}

model PaymentReceiptAllocation {
  id             String          @id @default(uuid()) @db.Uuid
  paymentId      String          @map("payment_id") @db.Uuid
  invoiceId      String          @map("invoice_id") @db.Uuid
  allocatedAmount Decimal        @map("allocated_amount") @db.Decimal(15, 4)

  payment        PaymentReceipt  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  invoice        SalesInvoice    @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@unique([paymentId, invoiceId])
  @@map("payment_receipt_allocations")
}
```

---

### 3.4 Purchase & Accounts Payable

```prisma
model Supplier {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  name           String          @db.VarChar(200)
  companyName    String?         @map("company_name") @db.VarChar(200)
  email          String?         @db.VarChar(255)
  phone          String?         @db.VarChar(20)
  gstin          String?         @db.VarChar(15)
  partyType      PartyType       @default(REGULAR) @map("party_type")
  state          String          @db.VarChar(100)
  stateCode      String          @map("state_code") @db.VarChar(2)
  billingAddress String          @map("billing_address") @db.Text
  currentBalance Decimal         @default(0) @map("current_balance") @db.Decimal(15, 4)
  isActive       Boolean         @default(true) @map("is_active")

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  purchaseInvoices PurchaseInvoice[]

  @@map("suppliers")
}

model PurchaseInvoice {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  supplierId     String          @map("supplier_id") @db.Uuid
  billNumber     String          @map("bill_number") @db.VarChar(50) // Internal tracking number
  supplierBillNo String          @map("supplier_bill_no") @db.VarChar(50) // Vendor's tax invoice number
  billDate       DateTime        @map("bill_date") @db.Date
  dueDate        DateTime        @map("due_date") @db.Date
  status         InvoiceStatus   @default(DRAFT)
  
  subtotalAmount Decimal         @default(0) @map("subtotal_amount") @db.Decimal(15, 4)
  discountAmount Decimal         @default(0) @map("discount_amount") @db.Decimal(15, 4)
  cgstAmount     Decimal         @default(0) @map("cgst_amount") @db.Decimal(15, 4)
  sgstAmount     Decimal         @default(0) @map("sgst_amount") @db.Decimal(15, 4)
  igstAmount     Decimal         @default(0) @map("igst_amount") @db.Decimal(15, 4)
  totalTaxAmount Decimal         @default(0) @map("total_tax_amount") @db.Decimal(15, 4)
  totalAmount    Decimal         @default(0) @map("total_amount") @db.Decimal(15, 4)
  paidAmount     Decimal         @default(0) @map("paid_amount") @db.Decimal(15, 4)
  dueAmount      Decimal         @default(0) @map("due_amount") @db.Decimal(15, 4)

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  supplier       Supplier        @relation(fields: [supplierId], references: [id])
  items          PurchaseInvoiceItem[]

  @@unique([organizationId, billNumber])
  @@map("purchase_invoices")
}

model PurchaseInvoiceItem {
  id             String          @id @default(uuid()) @db.Uuid
  billId         String          @map("bill_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  warehouseId    String          @map("warehouse_id") @db.Uuid
  hsnSacCode     String?         @map("hsn_sac_code") @db.VarChar(10)
  quantity       Decimal         @db.Decimal(12, 4)
  unitCost       Decimal         @map("unit_cost") @db.Decimal(15, 4)
  taxRate        Decimal         @map("tax_rate") @db.Decimal(5, 2)
  taxableAmount  Decimal         @map("taxable_amount") @db.Decimal(15, 4)
  cgstAmount     Decimal         @default(0) @map("cgst_amount") @db.Decimal(15, 4)
  sgstAmount     Decimal         @default(0) @map("sgst_amount") @db.Decimal(15, 4)
  igstAmount     Decimal         @default(0) @map("igst_amount") @db.Decimal(15, 4)
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)

  bill           PurchaseInvoice @relation(fields: [billId], references: [id], onDelete: Cascade)
  product        Product         @relation(fields: [productId], references: [id])

  @@map("purchase_invoice_items")
}
```

---

### 3.5 Double-Entry Accounting & General Ledger

```prisma
enum AccountCategory {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

model Account {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  code           String          @db.VarChar(20) // e.g. "1100" (Cash), "1200" (Accounts Receivable)
  name           String          @db.VarChar(150)
  category       AccountCategory
  parentId       String?         @map("parent_id") @db.Uuid
  isSystem       Boolean         @default(false) @map("is_system")
  currentBalance Decimal         @default(0) @map("current_balance") @db.Decimal(15, 4)

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  parent         Account?        @relation("AccountHierarchy", fields: [parentId], references: [id])
  children       Account[]       @relation("AccountHierarchy")
  journalLines   JournalEntryLine[]

  @@unique([organizationId, code])
  @@map("accounts")
}

enum JournalStatus {
  DRAFT
  POSTED
  REVERSED
}

model JournalEntry {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  entryNumber    String          @map("entry_number") @db.VarChar(50) // JRN-2026-00001
  entryDate      DateTime        @map("entry_date") @db.Date
  status         JournalStatus   @default(POSTED)
  referenceType  String?         @map("reference_type") @db.VarChar(50) // "SALES_INVOICE", "PAYMENT_RECEIPT"
  referenceId    String?         @map("reference_id") @db.Uuid
  narration      String          @db.Text
  totalDebit     Decimal         @map("total_debit") @db.Decimal(15, 4)
  totalCredit    Decimal         @map("total_credit") @db.Decimal(15, 4)
  postedAt       DateTime        @default(now()) @map("posted_at") @db.Timestamptz

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  lines          JournalEntryLine[]

  @@unique([organizationId, entryNumber])
  @@index([organizationId, entryDate])
  @@map("journal_entries")
}

model JournalEntryLine {
  id             String          @id @default(uuid()) @db.Uuid
  journalEntryId String          @map("journal_entry_id") @db.Uuid
  accountId      String          @map("account_id") @db.Uuid
  debit          Decimal         @default(0) @db.Decimal(15, 4)
  credit         Decimal         @default(0) @db.Decimal(15, 4)
  description    String?         @db.VarChar(255)

  journalEntry   JournalEntry    @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account        Account         @relation(fields: [accountId], references: [id])

  @@map("journal_entry_lines")
}
```

---

### 3.6 Offline Synchronization, Outbox & Audit Logging

```prisma
model SyncOutbox {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  deviceId       String          @map("device_id") @db.VarChar(100)
  operationId    String          @unique @map("operation_id") @db.VarChar(100) // UUIDv7
  entityType     String          @map("entity_type") @db.VarChar(50) // "sales_invoice", "customer"
  entityId       String          @map("entity_id") @db.Uuid
  mutationType   String          @map("mutation_type") @db.VarChar(10) // CREATE, UPDATE, DELETE
  payload        Json
  syncedAt       DateTime        @default(now()) @map("synced_at") @db.Timestamptz

  @@index([organizationId, deviceId, syncedAt])
  @@map("sync_outbox")
}

model SyncConflict {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  operationId    String          @map("operation_id") @db.VarChar(100)
  entityType     String          @map("entity_type") @db.VarChar(50)
  entityId       String          @map("entity_id") @db.Uuid
  serverVersion  Int             @map("server_version")
  clientVersion  Int             @map("client_version")
  serverPayload  Json            @map("server_payload")
  clientPayload  Json            @map("client_payload")
  resolution     String?         @db.VarChar(50) // "PENDING", "RESOLVED_SERVER", "RESOLVED_CLIENT"
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@map("sync_conflicts")
}

model IdempotencyRecord {
  key            String          @id @db.VarChar(255) // "org_id:idempotency_key"
  organizationId String          @map("organization_id") @db.Uuid
  endpoint       String          @db.VarChar(255)
  responseStatus Int             @map("response_status")
  responseBody   Json            @map("response_body")
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz
  expiresAt      DateTime        @map("expires_at") @db.Timestamptz

  @@index([expiresAt])
  @@map("idempotency_records")
}

model AuditLog {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  userId         String?         @map("user_id") @db.Uuid
  action         String          @db.VarChar(100) // "INVOICE_POSTED", "USER_ROLE_CHANGED"
  entityType     String          @map("entity_type") @db.VarChar(50)
  entityId       String          @map("entity_id") @db.Uuid
  ipAddress      String?         @map("ip_address") @db.VarChar(45)
  userAgent      String?         @map("user_agent") @db.VarChar(255)
  changes        Json?           // { before: {...}, after: {...} }
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User?           @relation(fields: [userId], references: [id])

  @@index([organizationId, createdAt])
  @@map("audit_logs")
}
```

---

### 3.7 Vyapar Feature Coverage Schema Extensions

#### 3.7.1 POS and Retail Counter Billing
```prisma
model PosRegister {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  name           String          @db.VarChar(100) // e.g. "Counter 1 - Fast Checkout"
  code           String          @db.VarChar(20)
  isActive       Boolean         @default(true) @map("is_active")
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  sessions       PosSession[]

  @@unique([organizationId, code])
  @@map("pos_registers")
}

model PosSession {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  registerId     String          @map("register_id") @db.Uuid
  openedById     String          @map("opened_by_id") @db.Uuid
  closedById     String?         @map("closed_by_id") @db.Uuid
  openingFloat   Decimal         @default(0) @map("opening_float") @db.Decimal(15, 4)
  closingCash    Decimal?        @map("closing_cash") @db.Decimal(15, 4)
  expectedCash   Decimal?        @map("expected_cash") @db.Decimal(15, 4)
  cashDifference Decimal?        @map("cash_difference") @db.Decimal(15, 4)
  status         String          @default("OPEN") @db.VarChar(20) // OPEN, CLOSED
  openedAt       DateTime        @default(now()) @map("opened_at") @db.Timestamptz
  closedAt       DateTime?       @map("closed_at") @db.Timestamptz
  notes          String?

  register       PosRegister     @relation(fields: [registerId], references: [id])
  payments       PosPaymentLine[]

  @@map("pos_sessions")
}

model PosPaymentLine {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  sessionId      String          @map("session_id") @db.Uuid
  invoiceId      String          @map("invoice_id") @db.Uuid
  paymentMode    String          @map("payment_mode") @db.VarChar(30) // CASH, UPI, CARD, WALLET, CHEQUE, CREDIT
  amount         Decimal         @db.Decimal(15, 4)
  referenceNo    String?         @map("reference_no") @db.VarChar(100)
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  session        PosSession      @relation(fields: [sessionId], references: [id])

  @@map("pos_payment_lines")
}
```

#### 3.7.2 Expense and Other Income Subsystem
```prisma
model ExpenseCategory {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  name           String          @db.VarChar(100)
  code           String?         @db.VarChar(50)
  accountId      String?         @map("account_id") @db.Uuid // Linked nominal expense ledger
  isTaxDeductible Boolean        @default(true) @map("is_tax_deductible")
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  expenses       Expense[]

  @@unique([organizationId, name])
  @@map("expense_categories")
}

model Expense {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  categoryId     String          @map("category_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  expenseDate    DateTime        @map("expense_date") @db.Date
  voucherNumber  String          @map("voucher_number") @db.VarChar(50)
  amount         Decimal         @db.Decimal(15, 4)
  isGstClaimable Boolean         @default(false) @map("is_gst_claimable")
  vendorGstin    String?         @map("vendor_gstin") @db.VarChar(15)
  vendorName     String?         @map("vendor_name") @db.VarChar(150)
  gstRate        Decimal?        @map("gst_rate") @db.Decimal(5, 2)
  cgstAmount     Decimal         @default(0) @map("cgst_amount") @db.Decimal(15, 4)
  sgstAmount     Decimal         @default(0) @map("sgst_amount") @db.Decimal(15, 4)
  igstAmount     Decimal         @default(0) @map("igst_amount") @db.Decimal(15, 4)
  paymentMode    String          @map("payment_mode") @db.VarChar(30) // CASH, BANK_TRANSFER, UPI
  bankAccountId  String?         @map("bank_account_id") @db.Uuid
  receiptUrl     String?         @map("receipt_url") @db.VarChar(500)
  isRecurring    Boolean         @default(false) @map("is_recurring")
  recurrenceUnit String?         @map("recurrence_unit") @db.VarChar(20) // MONTHLY, QUARTERLY, ANNUAL
  notes          String?
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  category       ExpenseCategory @relation(fields: [categoryId], references: [id])

  @@unique([organizationId, voucherNumber])
  @@map("expenses")
}

model OtherIncomeCategory {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  name           String          @db.VarChar(100)
  accountId      String?         @map("account_id") @db.Uuid
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  incomes        OtherIncome[]

  @@unique([organizationId, name])
  @@map("other_income_categories")
}

model OtherIncome {
  id             String              @id @default(uuid()) @db.Uuid
  organizationId String              @map("organization_id") @db.Uuid
  categoryId     String              @map("category_id") @db.Uuid
  incomeDate     DateTime            @map("income_date") @db.Date
  voucherNumber  String              @map("voucher_number") @db.VarChar(50)
  amount         Decimal             @db.Decimal(15, 4)
  source         String?             @db.VarChar(150) // e.g. "Interest from Fixed Deposit", "Scrap Sale"
  paymentMode    String              @map("payment_mode") @db.VarChar(30)
  bankAccountId  String?             @map("bank_account_id") @db.Uuid
  notes          String?
  createdAt      DateTime            @default(now()) @map("created_at") @db.Timestamptz

  category       OtherIncomeCategory @relation(fields: [categoryId], references: [id])

  @@unique([organizationId, voucherNumber])
  @@map("other_incomes")
}
```

#### 3.7.3 Orders, Delivery Challans, Credit & Debit Notes
```prisma
model SalesOrder {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  customerId     String          @map("customer_id") @db.Uuid
  orderNumber    String          @map("order_number") @db.VarChar(50)
  orderDate      DateTime        @map("order_date") @db.Date
  validUntil     DateTime?       @map("valid_until") @db.Date
  status         String          @default("PENDING") @db.VarChar(30) // PENDING, PARTIALLY_FULFILLED, COMPLETED, CANCELLED
  totalTaxable   Decimal         @map("total_taxable") @db.Decimal(15, 4)
  totalTax       Decimal         @map("total_tax") @db.Decimal(15, 4)
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)
  convertedInvoiceId String?     @map("converted_invoice_id") @db.Uuid
  notes          String?
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  lines          SalesOrderLine[]

  @@unique([organizationId, orderNumber])
  @@map("sales_orders")
}

model SalesOrderLine {
  id             String          @id @default(uuid()) @db.Uuid
  salesOrderId   String          @map("sales_order_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  quantity       Decimal         @db.Decimal(12, 4)
  fulfilledQty   Decimal         @default(0) @map("fulfilled_qty") @db.Decimal(12, 4)
  unitPrice      Decimal         @map("unit_price") @db.Decimal(15, 4)
  taxRate        Decimal         @map("tax_rate") @db.Decimal(5, 2)
  taxAmount      Decimal         @map("tax_amount") @db.Decimal(15, 4)
  lineTotal      Decimal         @map("line_total") @db.Decimal(15, 4)

  order          SalesOrder      @relation(fields: [salesOrderId], references: [id], onDelete: Cascade)

  @@map("sales_order_lines")
}

model PurchaseOrder {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  supplierId     String          @map("supplier_id") @db.Uuid
  orderNumber    String          @map("order_number") @db.VarChar(50)
  orderDate      DateTime        @map("order_date") @db.Date
  expectedDate   DateTime?       @map("expected_date") @db.Date
  status         String          @default("PLACED") @db.VarChar(30) // PLACED, RECEIVED_PARTIAL, RECEIVED_FULL, CANCELLED
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@unique([organizationId, orderNumber])
  @@map("purchase_orders")
}

model DeliveryChallan {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  customerId     String          @map("customer_id") @db.Uuid
  challanNumber  String          @map("challan_number") @db.VarChar(50)
  challanDate    DateTime        @map("challan_date") @db.Date
  vehicleNumber  String?         @map("vehicle_number") @db.VarChar(30)
  eWayBillNumber String?         @map("eway_bill_number") @db.VarChar(50)
  status         String          @default("DISPATCHED") @db.VarChar(30) // DISPATCHED, DELIVERED, RETURNED, INVOICED
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@unique([organizationId, challanNumber])
  @@map("delivery_challans")
}

model CreditNote {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  customerId     String          @map("customer_id") @db.Uuid
  noteNumber     String          @map("note_number") @db.VarChar(50)
  noteDate       DateTime        @map("note_date") @db.Date
  originalInvoiceId String?      @map("original_invoice_id") @db.Uuid
  reasonCode     String          @map("reason_code") @db.VarChar(50) // SALES_RETURN, POST_DISCOUNT, DEFICIENT_SERVICE
  taxableAmount  Decimal         @map("taxable_amount") @db.Decimal(15, 4)
  taxAmount      Decimal         @map("tax_amount") @db.Decimal(15, 4)
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@unique([organizationId, noteNumber])
  @@map("credit_notes")
}

model DebitNote {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  branchId       String          @map("branch_id") @db.Uuid
  supplierId     String          @map("supplier_id") @db.Uuid
  noteNumber     String          @map("note_number") @db.VarChar(50)
  noteDate       DateTime        @map("note_date") @db.Date
  originalBillId String?         @map("original_bill_id") @db.Uuid
  reasonCode     String          @map("reason_code") @db.VarChar(50) // PURCHASE_RETURN, RATE_CORRECTION
  taxableAmount  Decimal         @map("taxable_amount") @db.Decimal(15, 4)
  taxAmount      Decimal         @map("tax_amount") @db.Decimal(15, 4)
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@unique([organizationId, noteNumber])
  @@map("debit_notes")
}
```

#### 3.7.4 Advanced Inventory: Batches, Serials, MRP & Unit Conversion
```prisma
model ProductBatch {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  warehouseId    String          @map("warehouse_id") @db.Uuid
  batchNumber    String          @map("batch_number") @db.VarChar(100)
  mfgDate        DateTime?       @map("mfg_date") @db.Date
  expiryDate     DateTime?       @map("expiry_date") @db.Date
  mrp            Decimal         @db.Decimal(15, 4)
  purchasePrice  Decimal         @map("purchase_price") @db.Decimal(15, 4)
  salePrice      Decimal         @map("sale_price") @db.Decimal(15, 4)
  currentStock   Decimal         @default(0) @map("current_stock") @db.Decimal(12, 4)
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@unique([organizationId, productId, batchNumber, warehouseId])
  @@index([organizationId, expiryDate])
  @@map("product_batches")
}

model ProductSerial {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  warehouseId    String          @map("warehouse_id") @db.Uuid
  serialNumber   String          @map("serial_number") @db.VarChar(100)
  status         String          @default("IN_STOCK") @db.VarChar(20) // IN_STOCK, SOLD, DEFECTIVE, RETURNED
  purchaseBillId String?         @map("purchase_bill_id") @db.Uuid
  salesInvoiceId String?         @map("sales_invoice_id") @db.Uuid
  warrantyExpiry DateTime?       @map("warranty_expiry") @db.Date
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@unique([organizationId, productId, serialNumber])
  @@map("product_serials")
}

model UnitConversion {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  primaryUnitId  String          @map("primary_unit_id") @db.Uuid   // e.g. Box
  secondaryUnitId String         @map("secondary_unit_id") @db.Uuid // e.g. Pcs
  conversionRatio Decimal        @map("conversion_ratio") @db.Decimal(12, 4) // e.g. 1 Box = 10 Pcs

  @@unique([organizationId, productId])
  @@map("unit_conversions")
}

model PartyPriceMatrix {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  partyType      String          @map("party_type") @db.VarChar(20) // CUSTOMER, SUPPLIER
  partyId        String          @map("party_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  specialPrice   Decimal         @map("special_price") @db.Decimal(15, 4)
  minOrderQty    Decimal?        @map("min_order_qty") @db.Decimal(12, 4)
  discountPct    Decimal?        @map("discount_pct") @db.Decimal(5, 2)
  updatedAt      DateTime        @updatedAt @map("updated_at") @db.Timestamptz

  @@unique([organizationId, partyId, productId])
  @@map("party_price_matrices")
}
```

#### 3.7.5 Cash, Bank Ledgers & Loan Accounts
```prisma
model BankAccount {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  bankName       String          @map("bank_name") @db.VarChar(100)
  accountNumber  String          @map("account_number") @db.VarChar(50)
  ifscCode       String          @map("ifsc_code") @db.VarChar(20)
  branchName     String?         @map("branch_name") @db.VarChar(100)
  accountType    String          @map("account_type") @db.VarChar(30) // CURRENT, SAVINGS, OVERDRAFT, CASH_CREDIT
  upiId          String?         @map("upi_id") @db.VarChar(100)
  openingBalance Decimal         @default(0) @map("opening_balance") @db.Decimal(15, 4)
  currentBalance Decimal         @default(0) @map("current_balance") @db.Decimal(15, 4)
  isDefault      Boolean         @default(false) @map("is_default")
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  transactions   BankTransaction[]

  @@unique([organizationId, accountNumber])
  @@map("bank_accounts")
}

model BankTransaction {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  bankAccountId  String          @map("bank_account_id") @db.Uuid
  transactionDate DateTime       @map("transaction_date") @db.Date
  type           String          @db.VarChar(20) // DEPOSIT, WITHDRAWAL, TRANSFER, CHEQUE, CHARGE, INTEREST
  amount         Decimal         @db.Decimal(15, 4)
  balanceAfter   Decimal         @map("balance_after") @db.Decimal(15, 4)
  referenceNo    String?         @map("reference_no") @db.VarChar(100)
  chequeNumber   String?         @map("cheque_number") @db.VarChar(30)
  isReconciled   Boolean         @default(false) @map("is_reconciled")
  reconciledAt   DateTime?       @map("reconciled_at") @db.Timestamptz
  notes          String?

  account        BankAccount     @relation(fields: [bankAccountId], references: [id])

  @@map("bank_transactions")
}

model LoanAccount {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  lenderName     String          @map("lender_name") @db.VarChar(100) // e.g. "HDFC Bank Business Loan"
  loanNumber     String          @map("loan_number") @db.VarChar(50)
  principalAmount Decimal        @map("principal_amount") @db.Decimal(15, 4)
  interestRatePct Decimal        @map("interest_rate_pct") @db.Decimal(5, 2)
  tenureMonths   Int             @map("tenure_months")
  emiAmount      Decimal         @map("emi_amount") @db.Decimal(15, 4)
  disbursedDate  DateTime        @map("disbursed_date") @db.Date
  outstandingBalance Decimal     @map("outstanding_balance") @db.Decimal(15, 4)
  status         String          @default("ACTIVE") @db.VarChar(20) // ACTIVE, CLOSED

  emiSchedules   LoanEmiSchedule[]

  @@unique([organizationId, loanNumber])
  @@map("loan_accounts")
}

model LoanEmiSchedule {
  id             String          @id @default(uuid()) @db.Uuid
  loanAccountId  String          @map("loan_account_id") @db.Uuid
  installmentNo  Int             @map("installment_no")
  dueDate        DateTime        @map("due_date") @db.Date
  principalPart  Decimal         @map("principal_part") @db.Decimal(15, 4)
  interestPart   Decimal         @map("interest_part") @db.Decimal(15, 4)
  totalEmi       Decimal         @map("total_emi") @db.Decimal(15, 4)
  isPaid         Boolean         @default(false) @map("is_paid")
  paidDate       DateTime?       @map("paid_date") @db.Date

  loan           LoanAccount     @relation(fields: [loanAccountId], references: [id], onDelete: Cascade)

  @@map("loan_emi_schedules")
}
```

#### 3.7.6 Invoice Customization & Online Store
```prisma
model InvoiceTemplateConfig {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @unique @map("organization_id") @db.Uuid
  templateTheme  String          @default("MODERN_TEAL") @map("template_theme") @db.VarChar(50)
  paperSize      String          @default("A4") @map("paper_size") @db.VarChar(20) // A4, A5, THERMAL_80MM, THERMAL_58MM
  showLogo       Boolean         @default(true) @map("show_logo")
  showSignature  Boolean         @default(true) @map("show_signature")
  showQrCode     Boolean         @default(true) @map("show_qr_code")
  headerColor    String          @default("#0d9488") @map("header_color") @db.VarChar(20)
  customTerms    String?         @map("custom_terms")
  invoicePrefix  String          @default("INV") @map("invoice_prefix") @db.VarChar(20)
  customField1Title String?      @map("custom_field1_title") @db.VarChar(50)
  customField2Title String?      @map("custom_field2_title") @db.VarChar(50)

  @@map("invoice_template_configs")
}

model OnlineOrder {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  orderNumber    String          @map("order_number") @db.VarChar(50)
  customerName   String          @map("customer_name") @db.VarChar(150)
  customerPhone  String          @map("customer_phone") @db.VarChar(20)
  customerAddress String?        @map("customer_address")
  totalAmount    Decimal         @map("total_amount") @db.Decimal(15, 4)
  status         String          @default("NEW") @db.VarChar(30) // NEW, ACCEPTED, DISPATCHED, COMPLETED, REJECTED
  convertedInvoiceId String?     @map("converted_invoice_id") @db.Uuid
  placedAt       DateTime        @default(now()) @map("placed_at") @db.Timestamptz

  lines          OnlineOrderItem[]

  @@unique([organizationId, orderNumber])
  @@map("online_orders")
}

model OnlineOrderItem {
  id             String          @id @default(uuid()) @db.Uuid
  onlineOrderId  String          @map("online_order_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  productName    String          @map("product_name") @db.VarChar(255)
  quantity       Decimal         @db.Decimal(12, 4)
  unitPrice      Decimal         @map("unit_price") @db.Decimal(15, 4)
  lineTotal      Decimal         @map("line_total") @db.Decimal(15, 4)

  order          OnlineOrder     @relation(fields: [onlineOrderId], references: [id], onDelete: Cascade)

  @@map("online_order_items")
}

model Salesperson {
  id             String          @id @default(uuid()) @db.Uuid
  organizationId String          @map("organization_id") @db.Uuid
  name           String          @db.VarChar(150)
  phone          String          @db.VarChar(20)
  email          String?         @db.VarChar(255)
  commissionPct  Decimal         @default(0) @map("commission_pct") @db.Decimal(5, 2)
  isActive       Boolean         @default(true) @map("is_active")
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz

  @@map("salespersons")
}
```
