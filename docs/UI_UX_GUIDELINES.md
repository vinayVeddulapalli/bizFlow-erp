# BizFlow ERP — UI/UX Design System & Experience Guidelines

## 1. Brand Identity & Design Philosophy

**BizFlow ERP** is designed around a singular product philosophy: **"Engineered for Clarity, Speed, and Financial Truth."**

Enterprise business software is often plagued by cluttered tables, nested modal labyrinths, and sluggish interactions. BizFlow ERP diverges by presenting a modern, high-density, keyboard-accelerated SaaS interface inspired by Linear and Stripe, tailored specifically for high-velocity commercial workflows.

---

## 2. Color Palette & Theming System

```
PRIMARY BRAND (Navy & Slate)
--------------------------------------------------------------------------------
Primary Dark    #0F172A (Slate 900)   -- Main sidebar, strong contrast headings
Primary Surface #1E293B (Slate 800)   -- Elevated dark cards, navigation active state
Primary Light   #3B82F6 (Blue 500)    -- Primary brand actions, active focus rings

ACCENT & ACTION (Electric Teal)
--------------------------------------------------------------------------------
Accent Main     #0D9488 (Teal 600)    -- Primary CTA buttons, key highlights
Accent Hover    #0F766E (Teal 700)    -- Button hover state
Accent Subtle   #CCFBF1 (Teal 100)    -- Badge backgrounds, active pill highlights

SEMANTIC FINANCIAL STATUSES
--------------------------------------------------------------------------------
Positive (Inflow/Paid)   #10B981 (Emerald 500) -- Paid invoices, stock in, profits
Warning (Partial/Due)    #F59E0B (Amber 500)   -- Partially paid, due within 7 days
Danger (Overdue/Outflow) #EF4444 (Red 500)     -- Overdue invoices, low stock, cancel
Neutral (Draft/Archived) #64748B (Slate 500)   -- Draft status, disabled elements

BACKGROUNDS & SURFACES
--------------------------------------------------------------------------------
App Background  #F8FAFC (Slate 50)    -- Main canvas background
Card Surface    #FFFFFF (White)       -- Data cards, table surfaces, modals
Border Subdued  #E2E8F0 (Slate 200)   -- Dividers, table borders, card outlines
```

---

## 3. Typography & Numeric Precision

* **Primary Font**: `Inter` or `Plus Jakarta Sans` — high legibility at micro sizes (11px–13px) for dense data tables.
* **Financial & Numeric Font**: `JetBrains Mono` or standard sans with `font-feature-settings: 'tnum'` (`tabular-nums`).
  * **Rule**: All currency, quantities, invoice numbers, tax rates, and ledger balances MUST render with tabular figures so digits align vertically across table columns.

```css
.financial-figure {
  font-family: var(--font-mono), monospace;
  font-feature-settings: "tnum" on, "lnum" on;
  text-align: right;
}
```

---

## 4. Application Shell & Navigation Architecture

```
+-----------------------------------------------------------------------------------------------+
| [Logo] BizFlow | [Org Switcher: Acme Traders v] | [Search: Ctrl+K] | [Branch] [Notif] [User]  |
+-------------------+---------------------------------------------------------------------------+
| [Dashboard]       | BREADCRUMBS: Sales > Invoices > INV-2026-00012            [+ New Invoice] |
|                   +---------------------------------------------------------------------------+
| [Sales]           |                                                                           |
|   Customers       |  [Summary Cards: Total Outstanding, Paid Today, Overdue Count]            |
|   Quotations      |                                                                           |
|   Invoices        |  +---------------------------------------------------------------------+  |
|   Payments        |  | Search Invoices... | Status [All v] | Date [This Month v] | Export  |  |
|                   |  +---------------------------------------------------------------------+  |
| [Purchases]       |  | [x] | Invoice # | Customer     | Date       | Due     | Amount   | ... |  |
| [Inventory]       |  |-----|-----------|--------------|------------|---------|----------|-----|  |
| [Accounting]      |  | [ ] | INV-00012 | Sharma Ent.  | 18/11/2026 | Overdue | ₹14,160  | ... |  |
| [Reports]         |  | [ ] | INV-00011 | Bharat Ltd.  | 17/11/2026 | Paid    | ₹42,500  | ... |  |
|                   |  +---------------------------------------------------------------------+  |
| [Settings]        |  Showing 1-25 of 142 records                          < Page 1 of 6 >     |
+-------------------+---------------------------------------------------------------------------+
```

### 4.1 Key Shell Elements
1. **Persistent Organization Switcher**: Instant dropdown in the top bar. Selecting an organization updates the active tenant context without forcing a full-page reload.
2. **Global Command Palette (`Ctrl+K` / `Cmd+K`)**: Fast keyboard navigation allowing the user to type `"New Invoice"`, `"Find Customer Acme"`, `"Go to P&L"`, or `"Add Product"`.
3. **Branch Indicator**: Clearly displays the active operating branch (e.g., `Mumbai Warehouse`, `Delhi Showroom`).
4. **Collapsible Multi-Tier Sidebar**: Quick access to modules with badge indicators for pending tasks (e.g., `Low Stock: 4`, `Overdue Invoices: 9`).

---

## 5. Enterprise Component Specifications

### 5.1 High-Density Data Tables
Data tables are the core workhorse of an ERP. BizFlow tables must feature:
* **Sticky Table Headers**: Remain anchored to top on scroll.
* **Density Toggle**:
  - *Compact Mode* (32px row height) for high-volume inventory and transaction auditing.
  - *Comfortable Mode* (48px row height) for customer lists and general navigation.
* **Column Customization**: Ability to hide/show optional columns and save user view preferences.
* **Inline Status Pills**: Colored status badges (`Draft`, `Posted`, `Partially Paid`, `Cancelled`).
* **Multi-Select & Bulk Actions**: Select multiple rows to print batch PDF receipts, export to Excel, or mark reminders.

### 5.2 Rapid Invoice Creation UX (Keyboard-Accelerated)
Billing clerks and business owners need to issue invoices rapidly without touching a mouse.
* **Keyboard Navigation Flow**:
  1. `Enter` advances to the next cell.
  2. `Tab` moves across line fields: `Item Search` -> `Quantity` -> `Price` -> `Discount %` -> `Line Total`.
  3. `Ctrl + Enter` adds a new blank line.
  4. `F9` or `Ctrl + S` triggers invoice save/post.
* **Live Calculation HUD**: As line items are added, subtotal, CGST, SGST, IGST, round-off, and grand total update instantly in real time using the client-side `decimal.js` mirror.
* **Barcode Scanner Support**: Focused cursor on the item lookup field automatically intercepts 1D/2D USB barcode scanner inputs.

---

## 6. Feedback, States & Error Handling

* **Skeleton Loaders**: Zero blank layout shifts. Every data table and detail view renders animated pulsing skeleton frames during initial TanStack Query data fetching.
* **Optimistic UI Updates**: Master record edits (e.g., updating customer phone or category name) update immediately on screen, rolling back with a toast alert if the API reports an error.
* **Financial Irreversibility Modals**: Critical financial actions (Posting an Invoice, Cancelling a Document, Reversing a Journal) require an explicit confirmation modal with warning alerts explaining the permanent accounting consequence.
* **Toast Notifications**: Placed in top-right corner with auto-dismiss (4s) for successful operations and persistent dismissible banners for financial calculation warnings.
