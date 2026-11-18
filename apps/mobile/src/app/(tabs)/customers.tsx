import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OfflineDatabase, LocalCustomer } from '../../database/sqlite-client';
import { useCartStore } from '../../stores/cart-store';

export default function CustomersScreen() {
  const router = useRouter();
  const { setCustomer: setSelectedCartCustomer } = useCartStore();

  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<LocalCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Form state for adding local customer
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const db = OfflineDatabase.getInstance();
    const list = await db.getCustomers();
    setCustomers(list);
    setFilteredCustomers(list);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    const db = OfflineDatabase.getInstance();
    if (!text.trim()) {
      const list = await db.getCustomers();
      setCustomers(list);
      setFilteredCustomers(list);
    } else {
      const filtered = await db.searchCustomers(text);
      setFilteredCustomers(filtered);
    }
  };

  const handleSelectCustomer = (cust: LocalCustomer) => {
    setSelectedCartCustomer(cust);
    Alert.alert('Customer Selected', `${cust.name} set as active customer for billing.`, [
      {
        text: 'Go to Billing',
        onPress: () => router.push('/'),
      },
      {
        text: 'Stay Here',
        style: 'cancel',
      },
    ]);
  };

  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }

    const newCust: LocalCustomer = {
      id: `cust_${Date.now()}`,
      name: name.trim(),
      companyName: companyName.trim() || null,
      phone: phone.trim() || null,
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      currentBalance: 0,
    };

    const db = OfflineDatabase.getInstance();
    await db.setCustomers([...customers, newCust]);

    setName('');
    setCompanyName('');
    setPhone('');
    setGstin('');
    setModalVisible(false);

    await loadCustomers();
    Alert.alert('Success', 'Customer added to offline directory!');
  };

  return (
    <View style={styles.container}>
      {/* Search and Action Bar */}
      <View style={styles.headerBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or GSTIN..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Customer Count Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Showing {filteredCustomers.length} of {customers.length} offline customers
        </Text>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.customerName}>{item.name}</Text>
                {item.companyName && (
                  <Text style={styles.companyName}>{item.companyName}</Text>
                )}
                <View style={styles.metaRow}>
                  {item.phone && (
                    <Text style={styles.metaText}>☎ {item.phone}</Text>
                  )}
                  {item.gstin && (
                    <View style={styles.gstinBadge}>
                      <Text style={styles.gstinBadgeText}>GSTIN: {item.gstin}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.balanceCol}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    item.currentBalance > 0 ? styles.balanceDue : styles.balanceZero,
                  ]}
                >
                  ₹{item.currentBalance.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.billNowBtn}
              onPress={() => handleSelectCustomer(item)}
            >
              <Text style={styles.billNowBtnText}>Select for POS Billing →</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add Customer Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Offline Customer</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name *"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Company Name (Optional)"
              placeholderTextColor="#94a3b8"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number (e.g. 9820011223)"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="GSTIN (e.g. 27AAACA1234A1Z5)"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              value={gstin}
              onChangeText={setGstin}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddCustomer}
              >
                <Text style={styles.modalSubmitText}>Save Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
  summaryText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  companyName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  gstinBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gstinBadgeText: {
    fontSize: 10,
    color: '#14b8a6',
    fontWeight: '600',
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  balanceDue: {
    color: '#f87171',
  },
  balanceZero: {
    color: '#34d399',
  },
  billNowBtn: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  billNowBtnText: {
    color: '#14b8a6',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});