import { OfflineDatabase, OutboxEntry } from '../database/sqlite-client';
import { CartItem } from '../stores/cart-store';

export interface SyncResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

export class SyncEngine {
  private static instance: SyncEngine;
  private db: OfflineDatabase;

  private constructor() {
    this.db = OfflineDatabase.getInstance();
  }

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  public async queueOfflineInvoice(
    customerId: string,
    items: CartItem[],
    branchId: string = 'b1'
  ): Promise<OutboxEntry> {
    const operationId = `op_inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = {
      operationId,
      branchId,
      customerId,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      placeOfSupply: '27', // Default Maharashtra state code
      notes: 'Generated via BizFlow Mobile POS Counter (Offline Outbox)',
      autoPost: true,
      items: items.map((item) => ({
        productId: item.product.id.startsWith('p') ? undefined : item.product.id,
        description: item.product.name,
        hsnSacCode: '94013000',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: 0,
        taxRate: item.taxRate,
      })),
    };

    return this.db.enqueueOutbox(operationId, 'SALES_INVOICE', payload);
  }

  public async syncPendingOutbox(
    apiBaseUrl: string,
    authToken: string,
    organizationId: string
  ): Promise<SyncResult> {
    const pending = await this.db.getPendingOutbox();
    const result: SyncResult = {
      totalProcessed: pending.length,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const item of pending) {
      try {
        const payload = JSON.parse(item.payload);
        const res = await fetch(`${apiBaseUrl}/sales/invoices/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'x-organization-id': organizationId,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await this.db.markOutboxSynced(item.id);
          result.syncedCount++;
        } else {
          const errData = await res.json().catch(() => ({}));
          const errorMsg = errData.message || `Server returned status ${res.status}`;
          await this.db.markOutboxFailed(item.id, errorMsg);
          result.failedCount++;
          result.errors.push(`Operation ${item.operationId}: ${errorMsg}`);
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Network unreachable';
        await this.db.markOutboxFailed(item.id, errorMsg);
        result.failedCount++;
        result.errors.push(`Operation ${item.operationId}: ${errorMsg}`);
      }
    }

    return result;
  }
}
