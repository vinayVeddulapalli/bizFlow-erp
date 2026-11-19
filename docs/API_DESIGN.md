# BizFlow ERP — REST API Specification & Contract Design

## 1. Global API Conventions

### 1.1 Base URL & Versioning
All API endpoints are served under a versioned root prefix:
```http
https://api.bizflow.local/api/v1
```

### 1.2 Required Request Headers
| Header Name | Type | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <access_jwt>` | Short-lived JWT (15-min expiry) for user identification. |
| `X-Organization-Id` | `UUID` | Active organization context for multi-tenant data isolation. |
| `X-Branch-Id` | `UUID` | Optional active branch context for location-specific operations. |
| `Idempotency-Key` | `String` | Mandatory for mutating financial operations (`POST /invoices`, etc.). |
| `Content-Type` | `application/json` | Standard JSON payload format. |

### 1.3 Standard Response Envelopes

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "7b8f9e20-5c61-4284-8840-753bc6e8b41a",
    "invoiceNumber": "INV-2026-00012",
    "totalAmount": "14160.0000",
    "status": "POSTED"
  },
  "meta": {
    "timestamp": "2026-11-18T12:00:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 25,
      "totalRecords": 142,
      "totalPages": 6
    }
  }
}
```

#### Error Envelope (RFC 7807 Compliant)
```json
{
  "success": false,
  "statusCode": 422,
  "error": {
    "code": "UNBALANCED_JOURNAL_ENTRY",
    "message": "Debit total (15000.00) does not equal Credit total (14000.00).",
    "details": [
      {
        "field": "lines",
        "message": "Difference of 1000.00 detected."
      }
    ],
    "timestamp": "2026-11-18T12:00:00.000Z",
    "path": "/api/v1/accounting/journals"
  }
}
```

### 1.4 Query Parameter Standards
* **Pagination**: `?page=1&limit=25` (Default: `limit=25`, Max: `100`).
* **Sorting**: `?sortBy=createdAt&sortOrder=desc` (`asc` | `desc`).
* **Date Range**: `?startDate=2026-04-01&endDate=2026-04-30`.
* **Search**: `?search=Acme` (matches against names, SKU, invoice numbers).
* **Filters**: `?status=POSTED&warehouseId=uuid`.

---

## 2. Comprehensive Endpoint Catalog

### 2.1 Module 1: Authentication & Organization Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account. | No |
| `POST` | `/auth/login` | Login with email/password; returns JWT + refresh token cookie. | No |
| `POST` | `/auth/refresh` | Rotate access token using valid refresh token cookie. | No (Cookie) |
| `POST` | `/auth/logout` | Revoke current refresh token and clear cookie. | Yes |
| `GET` | `/auth/me` | Fetch authenticated user profile & accessible organizations. | Yes |
| `POST` | `/auth/forgot-password` | Send password reset link to user email. | No |
| `POST` | `/auth/reset-password` | Complete password reset using secure token. | No |
| `POST` | `/organizations` | Create a new business organization (tenant). | Yes |
| `GET` | `/organizations` | List all organizations the user is a member of. | Yes |
| `GET` | `/organizations/:id` | Get organization details, GST settings, and fiscal config. | Yes |
| `PATCH` | `/organizations/:id` | Update organization settings (Admin only). | Yes |
| `GET` | `/branches` | List branches belonging to the active organization. | Yes |
| `POST` | `/branches` | Create new branch / location. | Yes |
| `GET` | `/members` | List members and their assigned roles in active org. | Yes |
| `POST` | `/members/invite` | Send invitation link to a user with a specific role. | Yes |
| `GET` | `/roles` | List available roles and granular permissions. | Yes |

### 2.2 Module 2: Executive Dashboard
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | Real-time KPI cards: Total Sales, Purchases, Receivables, Payables. | Yes |
| `GET` | `/dashboard/sales-analytics` | Monthly revenue, gross margins, and sales trends. | Yes |
| `GET` | `/dashboard/cash-flow` | 30-day cash in vs cash out flow based on journal vouchers. | Yes |
| `GET` | `/dashboard/low-stock` | Items currently below reorder point or minimum stock level. | Yes |
| `GET` | `/dashboard/recent-transactions` | Last 10 posted invoices, bills, and payment receipts. | Yes |

### 2.3 Module 3: Sales & Accounts Receivable
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/sales/customers` | List customers with search, group, and balance filter. | Yes |
| `POST` | `/sales/customers` | Create new customer (with GSTIN validation & state code). | Yes |
| `GET` | `/sales/customers/:id` | Get customer profile, ledger, and aging statement. | Yes |
| `PATCH` | `/sales/customers/:id` | Update customer details or credit limits. | Yes |
| `GET` | `/sales/quotations` | List quotations/estimates. | Yes |
| `POST` | `/sales/quotations` | Create draft quotation. | Yes |
| `POST` | `/sales/quotations/:id/convert` | Convert quotation directly into sales invoice or order. | Yes |
| `GET` | `/sales/invoices` | List sales invoices with status, customer, and date filters. | Yes |
| `POST` | `/sales/invoices` | Create draft sales invoice (calculates line items, GST). | Yes |
| `GET` | `/sales/invoices/:id` | Get detailed sales invoice. | Yes |
| `POST` | `/sales/invoices/:id/post` | **Finalize & Post Invoice**: Deducts stock, writes journals. | Yes |
| `POST` | `/sales/invoices/:id/cancel` | Cancel posted invoice via reversing journal and stock return. | Yes |
| `GET` | `/sales/invoices/:id/pdf` | Download rendered tax invoice PDF (thermal or A4). | Yes |
| `POST` | `/sales/payments` | Record customer payment receipt against one or more invoices. | Yes |
| `GET` | `/sales/credit-notes` | List sales return credit notes. | Yes |
| `POST` | `/sales/credit-notes` | Create credit note (reverses revenue and taxes). | Yes |

### 2.4 Module 4: Purchase & Accounts Payable
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/purchases/suppliers` | List vendors with outstanding balances. | Yes |
| `POST` | `/purchases/suppliers` | Create new supplier master. | Yes |
| `GET` | `/purchases/orders` | List purchase orders. | Yes |
| `POST` | `/purchases/orders` | Create purchase order to vendor. | Yes |
| `GET` | `/purchases/bills` | List purchase invoices (bills). | Yes |
| `POST` | `/purchases/bills` | Record vendor bill (draft). | Yes |
| `POST` | `/purchases/bills/:id/post` | **Finalize Bill**: Increments warehouse stock, credits A/P. | Yes |
| `POST` | `/purchases/payments` | Record supplier payment voucher. | Yes |
| `POST` | `/purchases/debit-notes` | Create debit note for purchase returns. | Yes |

### 2.5 Module 5: Inventory & Warehouses
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory/products` | List products with current total stock and pricing. | Yes |
| `POST` | `/inventory/products` | Create new product or service. | Yes |
| `GET` | `/inventory/products/:id` | Get product details, warehouse-wise stock breakdown. | Yes |
| `PATCH` | `/inventory/products/:id` | Update product master data. | Yes |
| `GET` | `/inventory/categories` | List product category hierarchy tree. | Yes |
| `POST` | `/inventory/categories` | Create product category. | Yes |
| `GET` | `/inventory/warehouses` | List warehouses across all branches. | Yes |
| `POST` | `/inventory/warehouses` | Create new warehouse. | Yes |
| `GET` | `/inventory/stock-ledger` | Comprehensive stock movement ledger (IN/OUT history). | Yes |
| `POST` | `/inventory/transfers` | Transfer stock between two warehouses. | Yes |
| `POST` | `/inventory/adjustments` | Record manual physical stock reconciliation adjustments. | Yes |

### 2.6 Module 6: Double-Entry Accounting
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/accounting/accounts` | Chart of Accounts hierarchy tree (Assets, Liab, Equity, Rev, Exp). | Yes |
| `POST` | `/accounting/accounts` | Create new general ledger account. | Yes |
| `GET` | `/accounting/journals` | List posted journal entries. | Yes |
| `POST` | `/accounting/journals` | Post manual journal entry (validated Debit == Credit). | Yes |
| `GET` | `/accounting/reports/trial-balance` | Generate Trial Balance for a given date. | Yes |
| `GET` | `/accounting/reports/profit-and-loss` | Generate Profit & Loss statement for date range. | Yes |
| `GET` | `/accounting/reports/balance-sheet` | Generate Balance Sheet as of specific date. | Yes |
| `GET` | `/accounting/reports/cash-flow` | Generate Direct/Indirect Cash Flow statement. | Yes |

### 2.7 Module 7: GST & Taxation Engine
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/gst/settings` | Get organization GST profiles, composition scheme flag, states. | Yes |
| `GET` | `/gst/reports/gstr-1` | Generate GSTR-1 outward supplies summary (B2B, B2CL, B2CS). | Yes |
| `GET` | `/gst/reports/gstr-3b` | Generate GSTR-3B monthly return computation table. | Yes |
| `GET` | `/gst/reports/hsn-summary` | Generate HSN-wise sales quantity and tax report. | Yes |

### 2.8 Offline Synchronization Engine
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/sync/pull` | Fetch delta changes since client's last checkpoint timestamp. | Yes |
| `POST` | `/sync/push` | Submit batched outbox operations from offline client. | Yes |
| `GET` | `/sync/conflicts` | List unresolved conflicts awaiting operator attention. | Yes |
| `POST` | `/sync/conflicts/:id/resolve` | Resolve conflict with chosen payload resolution strategy. | Yes |

---

### 2.9 Module 9: POS & Retail Counter Billing
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/pos/registers` | List cash counter registers for active branch. | Yes |
| `POST` | `/pos/registers` | Register new POS counter workstation. | Yes |
| `GET` | `/pos/sessions/active` | Get current active POS shift session for user/register. | Yes |
| `POST` | `/pos/sessions/open` | Open register session with opening cash float. | Yes |
| `POST` | `/pos/sessions/close` | Reconcile and close register session (expected vs actual cash). | Yes |
| `POST` | `/pos/checkout` | High-speed retail checkout with split-tender payment allocations. | Yes |
| `GET` | `/pos/receipt/:id/escpos` | Raw ESC/POS thermal byte-stream for 80mm/58mm printers. | Yes |

### 2.10 Module 10: Expense & Other Income Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/expenses` | List business expenses with category, GST, and date filters. | Yes |
| `POST` | `/expenses` | Record new expense voucher (GST input credit claimable or non-GST). | Yes |
| `GET` | `/expenses/categories` | List configured business expense classifications. | Yes |
| `POST` | `/expenses/categories` | Add new nominal expense category. | Yes |
| `GET` | `/other-income` | List non-operating income vouchers (interest, scrap, etc.). | Yes |
| `POST` | `/other-income` | Record non-operating income transaction. | Yes |

### 2.11 Module 11: Advanced Commercial Orders & Return Vouchers
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/sales/orders` | List sales orders with fulfillment status. | Yes |
| `POST` | `/sales/orders` | Issue new customer sales order with item pricing and validity. | Yes |
| `POST` | `/sales/orders/:id/convert-to-invoice` | Convert open sales order directly into posted sales invoice. | Yes |
| `GET` | `/sales/delivery-challans` | List delivery challans with vehicle & e-way bill details. | Yes |
| `POST` | `/sales/delivery-challans` | Issue new goods delivery dispatch challan. | Yes |
| `GET` | `/sales/credit-notes` | List customer credit notes / sales returns. | Yes |
| `POST` | `/sales/credit-notes` | Issue credit note against posted invoice. | Yes |
| `GET` | `/purchases/orders` | List vendor purchase orders. | Yes |
| `POST` | `/purchases/orders` | Create supplier purchase order. | Yes |
| `GET` | `/purchases/debit-notes` | List supplier debit notes / purchase returns. | Yes |
| `POST` | `/purchases/debit-notes` | Issue debit note against purchase bill. | Yes |

### 2.12 Module 12: Advanced Inventory, Batches & Serial Tracking
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory/batches` | Query active product batches with Mfg/Expiry dates and MRP. | Yes |
| `POST` | `/inventory/batches` | Register or update batch stock allocation. | Yes |
| `GET` | `/inventory/serials` | Lookup unique serial number lifecycle and warranty status. | Yes |
| `POST` | `/inventory/barcodes/generate` | Generate barcode / QR code vector or image for SKU. | Yes |
| `GET` | `/inventory/party-pricing` | Get customer-specific or supplier-specific item price matrix. | Yes |
| `POST` | `/inventory/party-pricing` | Configure party-specific item rates and bulk volume discounts. | Yes |
| `GET` | `/inventory/alerts/expiry` | Near-expiry stock alerts (items expiring within 30/60/90 days). | Yes |

### 2.13 Module 13: Cash, Bank Accounts & Loans
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/banking/accounts` | List organization bank accounts, cash registers, and balances. | Yes |
| `POST` | `/banking/accounts` | Link new bank current/savings or cash ledger account. | Yes |
| `GET` | `/banking/transactions` | Passbook statement of debits, credits, and cheques. | Yes |
| `POST` | `/banking/transactions` | Record contra deposit, bank withdrawal, or fund transfer. | Yes |
| `POST` | `/banking/transactions/:id/reconcile` | Mark bank statement clearance with reconciliation date. | Yes |
| `GET` | `/banking/loans` | List business loans, outstanding balances, and EMI calendars. | Yes |
| `POST` | `/banking/loans` | Register new business loan with amortization tenure. | Yes |
| `POST` | `/banking/loans/:id/pay-emi` | Record EMI installment repayment (split principal vs interest). | Yes |

### 2.14 Module 14: Invoice Customization & Printing
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/settings/invoice-templates` | Get active tenant invoice theme, numbering prefix, and layout. | Yes |
| `PUT` | `/settings/invoice-templates` | Update invoice header colors, logo visibility, custom fields. | Yes |
| `GET` | `/sales/invoices/:id/print` | Render optimized print preview in A4, A5, or Thermal 80mm format. | Yes |

### 2.15 Module 15: Public Online Store & Customer Ordering
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/online-store/catalog` | Public product catalog with pricing and availability. | No |
| `POST` | `/online-store/orders` | Place online customer order with phone number and delivery address. | No |
| `GET` | `/online-store/admin/orders` | Merchant management of incoming web orders. | Yes |
| `POST` | `/online-store/admin/orders/:id/accept` | Accept and convert online order to sales invoice. | Yes |

### 2.16 Module 16: Operations, Audit & Salespersons
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/operations/salespersons` | List salesmen and commission rates. | Yes |
| `POST` | `/operations/salespersons` | Add new sales representative. | Yes |
| `GET` | `/operations/reports/salesperson-sales` | Performance and sales revenue attribution per salesperson. | Yes |
| `GET` | `/operations/audit-logs` | User activity and sensitive data mutation audit trail. | Yes |
