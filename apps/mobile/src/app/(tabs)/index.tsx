import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../stores/cart-store';
import { OfflineDatabase, LocalProduct } from '../../database/sqlite-client';
import { SyncEngine } from '../../services/sync-engine';

export default function PosBillingScreen() {
  const router = useRouter();
  const {
    items,
    customer,
    subtotal,
    taxTotal,
    grandTotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartStore();

  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const db = OfflineDatabase.getInstance();
    const list = await db.getProducts();
    setProducts(list);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    const db = OfflineDatabase.getInstance();
    if (!text.trim()) {
      const list = await db.getProducts();
      setProducts(list);
    } else {
      const filtered = await db.searchProducts(text);
      setProducts(filtered);
    }
  };

  const handleSaveInvoice = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add at least one product to create an invoice.');
      return;
    }

    try {
      setIsSubmitting(true);
      const syncEngine = SyncEngine.getInstance();
      const customerId = customer?.id || 'c1';
      const outboxEntry = await syncEngine.queueOfflineInvoice(customerId, items);

      Alert.alert(
        'Invoice Saved Offline!',
        `Operation ID: ${outboxEntry.operationId}\n\nInvoice is safely stored in local outbox queue and ready for server synchronization.`,
        [
          {
            text: 'New Sale',
            onPress: () => clearCart(),
          },
          {
            text: 'View Outbox',
            onPress: () => {
              clearCart();
              router.push('/sync');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save offline invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Customer Info Header Bar */}
      <View style={styles.customerBar}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerLabel}>BILL TO CUSTOMER:</Text>
          <Text style={styles.customerName}>{customer?.name || 'Walk-in Counter Customer'}</Text>
          {customer?.companyName && (
            <Text style={styles.customerSub}>{customer.companyName}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.changeCustomerBtn}
          onPress={() => router.push('/customers')}
        >
          <Text style={styles.changeCustomerText}>Change</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name, SKU or barcode..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Product Catalog Grid / List */}
        <Text style={styles.sectionHeader}>Quick Product Catalog</Text>
        <View style={styles.catalogGrid}>
          {products.map((prod) => (
            <TouchableOpacity
              key={prod.id}
              style={styles.productCard}
              onPress={() => addItem(prod, 1)}
            >
              <View style={styles.productBadge}>
                <Text style={styles.productBadgeText}>Stock: {prod.availableStock}</Text>
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {prod.name}
              </Text>
              <Text style={styles.productSku}>{prod.sku || 'SKU-N/A'}</Text>
              <View style={styles.productPriceRow}>
                <Text style={styles.productPrice}>₹{prod.salePrice.toLocaleString('en-IN')}</Text>
                <Text style={styles.productGst}>+{prod.taxRate}% GST</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Cart Section */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeaderRow}>
            <Text style={styles.sectionHeader}>Cart Items ({items.length})</Text>
            {items.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearCartText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyCartBox}>
              <Text style={styles.emptyCartText}>No items added yet. Tap items above to add.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.product.id} style={styles.cartItemRow}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemTitle}>{item.product.name}</Text>
                  <Text style={styles.cartItemMeta}>
                    ₹{item.unitPrice.toLocaleString('en-IN')} × {item.quantity} = ₹
                    {item.taxableAmount.toLocaleString('en-IN')} (+₹{item.taxAmount} GST)
                  </Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => removeItem(item.product.id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Checkout Footer Bar */}
      <View style={styles.footerBar}>
        <View style={styles.totalsCol}>
          <View style={styles.totalDetailRow}>
            <Text style={styles.totalDetailLabel}>Subtotal: ₹{subtotal.toLocaleString('en-IN')}</Text>
            <Text style={styles.totalDetailLabel}>GST: ₹{taxTotal.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.grandTotalText}>Total: ₹{grandTotal.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveInvoiceBtn, isSubmitting && styles.btnDisabled]}
          disabled={isSubmitting}
          onPress={handleSaveInvoice}
        >
          <Text style={styles.saveInvoiceBtnText}>
            {isSubmitting ? 'Saving...' : 'Save & Sync Invoice'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  customerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  customerInfo: {
    flex: 1,
  },
  customerLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  customerSub: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  changeCustomerBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeCustomerText: {
    color: '#14b8a6',
    fontWeight: '600',
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f766e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  productBadgeText: {
    color: '#ccfbf1',
    fontSize: 10,
    fontWeight: '600',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
    minHeight: 34,
  },
  productSku: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14b8a6',
  },
  productGst: {
    fontSize: 10,
    color: '#94a3b8',
  },
  cartSection: {
    marginTop: 8,
    marginBottom: 30,
  },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearCartText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyCartBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyCartText: {
    color: '#64748b',
    fontSize: 13,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  cartItemMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 8,
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  qtyText: {
    color: '#14b8a6',
    fontWeight: '700',
    fontSize: 13,
    minWidth: 20,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  totalsCol: {
    flex: 1,
  },
  totalDetailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  totalDetailLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  saveInvoiceBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveInvoiceBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});