# BizFlow ERP — Entity Relationship Diagrams & Data Models

## 1. Tenancy, IAM, and Organization Model

```mermaid
erDiagram
    users ||--o{ organization_members : "belongs to"
    organizations ||--o{ organization_members : "has"
    roles ||--o{ organization_members : "grants"
    organizations ||--o{ branches : "operates"
    branches ||--o{ warehouses : "contains"
    organizations ||--o{ audit_logs : "records"
    users ||--o{ audit_logs : "triggers"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        boolean is_email_verified
        boolean is_active
        timestamptz created_at
    }

    organizations {
        uuid id PK
        varchar name
        varchar gstin
        varchar currency_code
        int fiscal_year_start_month
        timestamptz created_at
    }

    organization_members {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        uuid role_id FK
        boolean is_default
    }

    roles {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar_array permissions
        boolean is_system
    }

    branches {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar code
        varchar gstin
        varchar state_code
        boolean is_main_branch
    }

    warehouses {
        uuid id PK
        uuid organization_id FK
        uuid branch_id FK
        varchar name
        varchar code
        boolean is_default
    }
```

---

## 2. Master Catalog & Multi-Warehouse Inventory

```mermaid
erDiagram
    organizations ||--o{ products : "owns"
    product_categories ||--o{ products : "classifies"
    product_categories ||--o{ product_categories : "parent/child"
    units_of_measurement ||--o{ products : "measures"
    products ||--o{ stock_levels : "tracked in"
    warehouses ||--o{ stock_levels : "holds"
    products ||--o{ stock_movements : "logs"
    warehouses ||--o{ stock_movements : "source/dest"

    products {
        uuid id PK
        uuid organization_id FK
        varchar type
        varchar name
        varchar sku UK
        varchar barcode
        varchar hsn_sac_code
        decimal selling_price
        decimal purchase_price
        decimal tax_rate
        decimal min_stock_level
    }

    stock_levels {
        uuid id PK
        uuid organization_id FK
        uuid product_id FK
        uuid warehouse_id FK
        decimal quantity
    }

    stock_movements {
        uuid id PK
        uuid organization_id FK
        uuid product_id FK
        uuid warehouse_id FK
        varchar movement_type
        decimal quantity
        decimal unit_cost
        uuid reference_id
        timestamptz created_at
    }
```

---

## 3. Sales, Invoicing, and Receivables

```mermaid
erDiagram
    organizations ||--o{ customers : "manages"
    organizations ||--o{ sales_invoices : "bills"
    customers ||--o{ sales_invoices : "receives"
    sales_invoices ||--o{ sales_invoice_items : "contains"
    products ||--o{ sales_invoice_items : "billed as"
    customers ||--o{ payment_receipts : "pays"
    payment_receipts ||--o{ payment_receipt_allocations : "distributes"
    sales_invoices ||--o{ payment_receipt_allocations : "clears"

    customers {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar gstin
        varchar state_code
        decimal credit_limit
        decimal current_balance
    }

    sales_invoices {
        uuid id PK
        uuid organization_id FK
        uuid branch_id FK
        uuid customer_id FK
        varchar invoice_number UK
        date invoice_date
        date due_date
        varchar status
        decimal subtotal_amount
        decimal cgst_amount
        decimal sgst_amount
        decimal igst_amount
        decimal total_amount
        decimal paid_amount
        decimal due_amount
        int version
    }

    sales_invoice_items {
        uuid id PK
        uuid invoice_id FK
        uuid product_id FK
        uuid warehouse_id FK
        decimal quantity
        decimal unit_price
        decimal taxable_amount
        decimal tax_rate
        decimal total_amount
    }

    payment_receipts {
        uuid id PK
        uuid organization_id FK
        uuid customer_id FK
        varchar receipt_number UK
        date payment_date
        varchar payment_mode
        decimal amount
    }

    payment_receipt_allocations {
        uuid id PK
        uuid payment_id FK
        uuid invoice_id FK
        decimal allocated_amount
    }
```

---

## 4. Double-Entry General Ledger Subsystem

```mermaid
erDiagram
    organizations ||--o{ accounts : "charts"
    accounts ||--o{ accounts : "parent/child hierarchy"
    organizations ||--o{ journal_entries : "posts"
    journal_entries ||--o{ journal_entry_lines : "contains"
    accounts ||--o{ journal_entry_lines : "impacts"

    accounts {
        uuid id PK
        uuid organization_id FK
        varchar code UK
        varchar name
        varchar category
        decimal current_balance
        boolean is_system
    }

    journal_entries {
        uuid id PK
        uuid organization_id FK
        varchar entry_number UK
        date entry_date
        varchar status
        varchar reference_type
        uuid reference_id
        decimal total_debit
        decimal total_credit
        text narration
        timestamptz posted_at
    }

    journal_entry_lines {
        uuid id PK
        uuid journal_entry_id FK
        uuid account_id FK
        decimal debit
        decimal credit
        varchar description
    }
```

---

## 5. Cross-Module Transactional Flow

The diagram below illustrates how a single business event (**Posting a Sales Invoice**) guarantees consistency across Sales, Inventory, and General Ledger via an atomic database transaction.

```mermaid
flowchart TD
    POST_REQ["User Posts Invoice (INV-001)"] --> TX_START["BEGIN Prisma Transaction"]
    
    subgraph Transaction_Boundary ["Atomic Transaction Scope"]
        UPDATE_INV["1. Update sales_invoices\nStatus: POSTED, Assign Official No"]
        DECR_STOCK["2. For each invoice item:\nInsert stock_movements (OUT)\nDecrement stock_levels"]
        POST_JRNL["3. Insert journal_entries (JRN-001)\nTotal Debit == Total Credit"]
        POST_LINES["4. Insert journal_entry_lines:\n- Debit Accounts Receivable (1200)\n- Credit Sales Revenue (4100)\n- Credit CGST Output Payable (2210)\n- Credit SGST Output Payable (2220)"]
        UPDATE_CUST["5. Update customers:\nIncrement current_balance by due_amount"]
    end

    TX_START --> UPDATE_INV
    UPDATE_INV --> DECR_STOCK
    DECR_STOCK --> POST_JRNL
    POST_JRNL --> POST_LINES
    POST_LINES --> UPDATE_CUST
    UPDATE_CUST --> TX_COMMIT["COMMIT Transaction"]
    TX_COMMIT --> EMIT_EVENT["Emit Domain Events (PDF Render, Audit Log)"]
```

---

## 6. Referential Integrity & Cascade Rules Matrix

| Parent Table | Child Table | Foreign Key Column | On Delete Action | On Update Action | Architectural Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `organizations` | `organization_members` | `organization_id` | `CASCADE` | `CASCADE` | Org deletion wipes all associated members. |
| `organizations` | `sales_invoices` | `organization_id` | `CASCADE` | `CASCADE` | Top-level tenant lifecycle boundary. |
| `customers` | `sales_invoices` | `customer_id` | `RESTRICT` | `CASCADE` | Cannot delete customer with posted invoices. |
| `sales_invoices` | `sales_invoice_items` | `invoice_id` | `CASCADE` | `CASCADE` | Deleting draft invoice purges its line items. |
| `products` | `sales_invoice_items` | `product_id` | `RESTRICT` | `CASCADE` | Cannot delete a product referenced in transactions. |
| `accounts` | `journal_entry_lines` | `account_id` | `RESTRICT` | `CASCADE` | Cannot delete an account with financial history. |
| `journal_entries` | `journal_entry_lines`| `journal_entry_id` | `RESTRICT` | `CASCADE` | Posted financial lines cannot be orphaned. |
| `warehouses` | `stock_levels` | `warehouse_id` | `RESTRICT` | `CASCADE` | Cannot delete warehouse with active stock. |
