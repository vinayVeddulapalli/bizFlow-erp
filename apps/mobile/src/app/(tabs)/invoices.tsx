import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OfflineDatabase, OutboxEntry } from '../../database/sqlite-client';

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  status: 'SYNCED' | 'PENDING' | 'FAILED';
  source: 'OUTBOX' | 'CLOUD';
}

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const db = OfflineDatabase.getInstance();
    const outboxEntries = await db.getAllOutbox();

    const localItems: InvoiceListItem[] = outboxEntries
      .filter((e) => e.entityType === 'SALES_INVOICE')
      .map((e: OutboxEntry) => {
        let amount = 0;
        let customerName = 'Walk-in Customer';
        try {
          const payload = JSON.parse(e.payload);
          customerName = payload.customerId === 'c2' ? 'Apex Logistics' : payload.customerId === 'c3' ? 'Metro Mart' : 'Walk-in Customer';
          if (Array.isArray(payload.items)) {
            amount = payload.items.reduce((sum: number, it: any) => sum + (it.unitPrice * it.quantity), 0);
          }
        } catch {
          // ignore
        }

        return {
          id: e.id,
          invoiceNumber: e.operationId,
          customerName,
          date: e.createdAt.split('T')[0],
          amount,
          status: e.status,
          source: 'OUTBOX',
        };
      });

    // Mock initial synced historical invoices from cloud
    const cloudItems: InvoiceListItem[] = [
      {
        id: 'inv_101',
        invoiceNumber: 'INV-2026-27-00001',
        customerName: 'Metro Retail Mart',
        date: '2026-11-15',
        amount: 28900,
        status: 'SYNCED',
        source: 'CLOUD',
      },
      {
        id: 'inv_102',
        invoiceNumber: 'INV-2026-27-00002',
        customerName: 'Apex Logistics Pvt Ltd',
        date: '2026-11-16',
        amount: 14500,
        status: 'SYNCED',
        source: 'CLOUD',
      },
    ];

    const combined = [...localItems, ...cloudItems];
    setInvoices(combined);
    applySearch(searchQuery, combined);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const applySearch = (query: string, list: InvoiceListItem[]) => {
    if (!query.trim()) {
      setFilteredInvoices(list);
    } else {
      const q = query.toLowerCase();
      setFilteredInvoices(
        list.filter(
          (inv) =>
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.customerName.toLowerCase().includes(q)
        )
      );
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    applySearch(text, invoices);
  };

  const pendingCount = invoices.filter((i) => i.status === 'PENDING').length;
  const syncedCount = invoices.filter((i) => i.status === 'SYNCED').length;

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{invoices.length}</Text>
          <Text style={styles.statLabel}>Total Invoices</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{syncedCount}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending Outbox</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by customer or invoice number..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#14b8a6" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySubtitle}>
              Create your first mobile invoice from the POS Billing tab.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.invoiceNumberCol}>
                <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{item.date}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.status === 'SYNCED'
                    ? styles.badgeSynced
                    : item.status === 'PENDING'
                    ? styles.badgePending
                    : styles.badgeFailed,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.status === 'SYNCED'
                      ? styles.badgeTextSynced
                      : item.status === 'PENDING'
                      ? styles.badgeTextPending
                      : styles.badgeTextFailed,
                  ]}
                >
                  {item.status === 'SYNCED'
                    ? '✓ Synced'
                    : item.status === 'PENDING'
                    ? '◷ Outbox Pending'
                    : '✕ Sync Failed'}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View>
                <Text style={styles.customerLabel}>Customer</Text>
                <Text style={styles.customerName}>{item.customerName}</Text>
              </View>
              <View style={styles.amountCol}>
                <Text style={styles.amountLabel}>Total Amount</Text>
                <Text style={styles.amountValue}>₹{item.amount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {item.status === 'PENDING' && (
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={() => router.push('/sync')}
              >
                <Text style={styles.syncBtnText}>View in Sync Manager →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  searchWrapper: {
    padding: 12,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
    marginBottom: 10,
  },
  invoiceNumberCol: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  invoiceDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeSynced: {
    backgroundColor: '#064e3b',
  },
  badgePending: {
    backgroundColor: '#78350f',
  },
  badgeFailed: {
    backgroundColor: '#7f1d1d',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextSynced: {
    color: '#34d399',
  },
  badgeTextPending: {
    color: '#fbbf24',
  },
  badgeTextFailed: {
    color: '#f87171',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14b8a6',
    marginTop: 2,
  },
  syncBtn: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  syncBtnText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});