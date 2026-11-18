// SQLite offline storage interface for BizFlow ERP Mobile
export interface LocalProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  salePrice: number;
  taxRate: number;
  availableStock: number;
}

export interface LocalCustomer {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  gstin: string | null;
  currentBalance: number;
}

export interface OutboxEntry {
  id: string;
  operationId: string;
  entityType: 'SALES_INVOICE' | 'PAYMENT_RECEIPT';
  payload: string; // JSON stringified payload
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

export class OfflineDatabase {
  private static instance: OfflineDatabase;
  private products: Map<string, LocalProduct> = new Map();
  private customers: Map<string, LocalCustomer> = new Map();
  private outbox: Map<string, OutboxEntry> = new Map();

  private constructor() {
    this.seedInitialLocalData();
  }

  public static getInstance(): OfflineDatabase {
    if (!OfflineDatabase.instance) {
      OfflineDatabase.instance = new OfflineDatabase();
    }
    return OfflineDatabase.instance;
  }

  private seedInitialLocalData() {
    // Seed offline catalog
    const sampleProducts: LocalProduct[] = [
      { id: 'p1', name: 'Ergonomic Desk Chair', sku: 'CHR-ERG-01', barcode: '8901234567890', salePrice: 4500, taxRate: 18, availableStock: 45 },
      { id: 'p2', name: 'Standing Desk Converter', sku: 'DSK-STD-02', barcode: '8901234567891', salePrice: 12000, taxRate: 18, availableStock: 18 },
      { id: 'p3', name: 'Wireless Mechanical Keyboard', sku: 'KBD-WRL-03', barcode: '8901234567892', salePrice: 3200, taxRate: 18, availableStock: 60 },
      { id: 'p4', name: 'USB-C Dual 4K Docking Station', sku: 'DCK-USBC-04', barcode: '8901234567893', salePrice: 8500, taxRate: 18, availableStock: 25 },
      { id: 'p5', name: 'Thermal Receipt Paper Roll (80mm)', sku: 'PPR-THM-05', barcode: '8901234567894', salePrice: 150, taxRate: 12, availableStock: 500 },
    ];
    sampleProducts.forEach((p) => this.products.set(p.id, p));

    // Seed offline customers
    const sampleCustomers: LocalCustomer[] = [
      { id: 'c1', name: 'Walk-in Counter Customer', companyName: 'Retail Cash', phone: '9999999999', gstin: null, currentBalance: 0 },
      { id: 'c2', name: 'Apex Logistics Pvt Ltd', companyName: 'Apex Logistics', phone: '9820011223', gstin: '27AAACA1234A1Z5', currentBalance: 14500 },
      { id: 'c3', name: 'Metro Retail Mart', companyName: 'Metro Mart', phone: '9819922334', gstin: '27BBBCA5678B1Z2', currentBalance: 28900 },
    ];
    sampleCustomers.forEach((c) => this.customers.set(c.id, c));
  }

  // Products
  public async getProducts(): Promise<LocalProduct[]> {
    return Array.from(this.products.values());
  }

  public async searchProducts(query: string): Promise<LocalProduct[]> {
    const q = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q))
    );
  }

  public async setProducts(products: LocalProduct[]): Promise<void> {
    products.forEach((p) => this.products.set(p.id, p));
  }

  // Customers
  public async getCustomers(): Promise<LocalCustomer[]> {
    return Array.from(this.customers.values());
  }

  public async searchCustomers(query: string): Promise<LocalCustomer[]> {
    const q = query.toLowerCase();
    return Array.from(this.customers.values()).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }

  public async setCustomers(customers: LocalCustomer[]): Promise<void> {
    customers.forEach((c) => this.customers.set(c.id, c));
  }

  // Outbox Queue
  public async enqueueOutbox(
    operationId: string,
    entityType: 'SALES_INVOICE' | 'PAYMENT_RECEIPT',
    payload: any
  ): Promise<OutboxEntry> {
    const entry: OutboxEntry = {
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operationId,
      entityType,
      payload: JSON.stringify(payload),
      status: 'PENDING',
      retryCount: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
    };
    this.outbox.set(entry.id, entry);
    return entry;
  }

  public async getPendingOutbox(): Promise<OutboxEntry[]> {
    return Array.from(this.outbox.values()).filter((e) => e.status === 'PENDING');
  }

  public async markOutboxSynced(id: string): Promise<void> {
    const entry = this.outbox.get(id);
    if (entry) {
      entry.status = 'SYNCED';
      this.outbox.set(id, entry);
    }
  }

  public async markOutboxFailed(id: string, error: string): Promise<void> {
    const entry = this.outbox.get(id);
    if (entry) {
      entry.status = 'FAILED';
      entry.retryCount++;
      entry.lastError = error;
      this.outbox.set(id, entry);
    }
  }

  public async getAllOutbox(): Promise<OutboxEntry[]> {
    return Array.from(this.outbox.values()).reverse();
  }
}
