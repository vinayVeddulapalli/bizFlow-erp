import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { OfflineDatabase, OutboxEntry } from '../../database/sqlite-client';
import { SyncEngine, SyncResult } from '../../services/sync-engine';

export default function SyncManagerScreen() {
  const [outboxEntries, setOutboxEntries] = useState<OutboxEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Sync endpoint configuration
  const [apiUrl, setApiUrl] = useState('http://localhost:3000/api/v1');
  const [token, setToken] = useState('offline_mobile_token');
  const [orgId, setOrgId] = useState('org_default_1');

  useEffect(() => {
    loadOutbox();
  }, []);

  const loadOutbox = async () => {
    const db = OfflineDatabase.getInstance();
    const list = await db.getAllOutbox();
    setOutboxEntries(list);
  };

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const syncEngine = SyncEngine.getInstance();
      const result = await syncEngine.syncPendingOutbox(apiUrl, token, orgId);
      setLastSyncResult(result);
      await loadOutbox();

      if (result.syncedCount > 0 && result.failedCount === 0) {
        Alert.alert(
          'Sync Completed Successfully',
          `Synchronized ${result.syncedCount} offline record(s) to BizFlow Cloud.`
        );
      } else if (result.failedCount > 0) {
        Alert.alert(
          'Sync Completed with Errors',
          `${result.syncedCount} succeeded, ${result.failedCount} failed.\n\nError: ${result.errors[0] || 'Unknown'}`
        );
      } else {
        Alert.alert('Outbox Empty', 'All offline transactions are already synced.');
      }
    } catch (err: any) {
      Alert.alert('Sync Failure', err.message || 'Unable to connect to BizFlow API.');
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = outboxEntries.filter((e) => e.status === 'PENDING').length;
  const syncedCount = outboxEntries.filter((e) => e.status === 'SYNCED').length;
  const failedCount = outboxEntries.filter((e) => e.status === 'FAILED').length;

  return (
    <ScrollView style={styles.container}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Offline-First Outbox Synchronization</Text>
        <Text style={styles.bannerSubtitle}>
          All transactions created offline are queued in local SQLite outbox with unique operation
          IDs and synced idempotently to the server.
        </Text>
      </View>

      {/* Metric Cards */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
          <Text style={styles.metricLabel}>Pending</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#10b981' }]}>{syncedCount}</Text>
          <Text style={styles.metricLabel}>Synced</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#ef4444' }]}>{failedCount}</Text>
          <Text style={styles.metricLabel}>Failed</Text>
        </View>
      </View>

      {/* Sync Action Button */}
      <View style={styles.syncActionWrapper}>
        <TouchableOpacity
          style={[styles.syncButton, (isSyncing || pendingCount === 0) && styles.syncBtnDisabled]}
          disabled={isSyncing || pendingCount === 0}
          onPress={handleTriggerSync}
        >
          {isSyncing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.syncButtonText}>
              {pendingCount > 0 ? `Flush ${pendingCount} Outbox Items Now` : 'Outbox Fully Synced'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Server Config Accordion */}
      <View style={styles.configBox}>
        <Text style={styles.configTitle}>API Connection Settings</Text>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>NestJS API Base URL:</Text>
          <TextInput
            style={styles.configInput}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://localhost:3000/api/v1"
            placeholderTextColor="#94a3b8"
          />
        </View>
        <View style={styles.configField}>
          <Text style={styles.configLabel}>Tenant Organization ID:</Text>
          <TextInput
            style={styles.configInput}
            value={orgId}
            onChangeText={setOrgId}
            placeholder="Organization ID"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Outbox Activity List */}
      <View style={styles.listSection}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Local Outbox Ledger ({outboxEntries.length})</Text>
          <TouchableOpacity onPress={loadOutbox}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {outboxEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Outbox is clean. No offline activity logged.</Text>
          </View>
        ) : (
          outboxEntries.map((entry) => {
            let detail = '';
            try {
              const p = JSON.parse(entry.payload);
              detail = `${entry.entityType} | Items: ${p.items?.length || 0} | Due: ${p.dueDate}`;
            } catch {
              detail = entry.entityType;
            }

            return (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryOpId}>{entry.operationId}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      entry.status === 'SYNCED'
                        ? styles.pillSynced
                        : entry.status === 'PENDING'
                        ? styles.pillPending
                        : styles.pillFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        entry.status === 'SYNCED'
                          ? styles.pillTextSynced
                          : entry.status === 'PENDING'
                          ? styles.pillTextPending
                          : styles.pillTextFailed,
                      ]}
                    >
                      {entry.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.entryDetails}>{detail}</Text>
                <Text style={styles.entryTime}>Logged: {new Date(entry.createdAt).toLocaleString()}</Text>

                {entry.lastError && (
                  <View style={styles.errorNotice}>
                    <Text style={styles.errorNoticeText}>Error: {entry.lastError}</Text>
                    <Text style={styles.retryText}>Retries: {entry.retryCount}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 14,
  },
  banner: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  syncActionWrapper: {
    marginBottom: 14,
  },
  syncButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    backgroundColor: '#334155',
  },
  syncButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  configBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  configField: {
    marginBottom: 10,
  },
  configLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listSection: {
    marginBottom: 40,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  refreshText: {
    color: '#14b8a6',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  entryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryOpId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillSynced: {
    backgroundColor: '#064e3b',
  },
  pillPending: {
    backgroundColor: '#78350f',
  },
  pillFailed: {
    backgroundColor: '#7f1d1d',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillTextSynced: {
    color: '#34d399',
  },
  pillTextPending: {
    color: '#fbbf24',
  },
  pillTextFailed: {
    color: '#f87171',
  },
  entryDetails: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 10,
    color: '#64748b',
  },
  errorNotice: {
    marginTop: 8,
    backgroundColor: '#450a0a',
    padding: 8,
    borderRadius: 4,
  },
  errorNoticeText: {
    color: '#fca5a5',
    fontSize: 11,
  },
  retryText: {
    color: '#f87171',
    fontSize: 10,
    marginTop: 2,
  },
});