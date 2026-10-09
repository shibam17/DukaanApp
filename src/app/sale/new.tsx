import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { useProductSearch } from '../../hooks/useProductSearch';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';
import { friendlyError } from '../../utils/errors';
import { formatINR } from '../../utils/format';

export default function RecordSaleScreen() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { products, loading, search, setSearch } = useProductSearch(business?.id);

  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ quantity?: string; unitPrice?: string }>({});

  const qtyNum = Number(quantity);
  const priceNum = Number(unitPrice);

  const totalRevenue = useMemo(() => {
    if (Number.isNaN(qtyNum) || Number.isNaN(priceNum)) return 0;
    return qtyNum * priceNum;
  }, [qtyNum, priceNum]);

  const estimatedProfit = useMemo(() => {
    if (!selected || Number.isNaN(qtyNum) || Number.isNaN(priceNum)) return 0;
    return (priceNum - selected.purchase_price) * qtyNum;
  }, [selected, qtyNum, priceNum]);

  const selectProduct = (product: Product) => {
    setSelected(product);
    setQuantity('1');
    setUnitPrice(String(product.selling_price));
    setError(null);
    setFieldErrors({});
  };

  const clearSelection = () => {
    setSelected(null);
    setQuantity('1');
    setUnitPrice('');
    setError(null);
    setFieldErrors({});
  };

  const onSave = async () => {
    if (!business?.id || !user?.id || !selected || saving) return;

    const nextErrors: { quantity?: string; unitPrice?: string } = {};

    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      nextErrors.quantity = 'Quantity must be greater than 0';
    } else if (qtyNum > selected.stock) {
      nextErrors.quantity = `Only ${selected.stock} in stock`;
    }

    if (Number.isNaN(priceNum) || priceNum < 0) {
      nextErrors.unitPrice = 'Price must be 0 or more';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    const { error: rpcError } = await supabase.rpc('record_sale', {
      p_business_id: business.id,
      p_product_id: selected.id,
      p_quantity: qtyNum,
      p_unit_price: priceNum,
      p_user_id: user.id,
    });

    setSaving(false);

    if (rpcError) {
      setError(friendlyError(rpcError, 'Could not record sale.'));
      return;
    }

    router.replace('/(tabs)/sales');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (selected) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Pressable onPress={clearSelection} disabled={saving}>
            <Text style={styles.changeProduct}>← Change product</Text>
          </Pressable>

          <Text style={styles.productTitle}>{selected.name}</Text>
          {selected.variant_name ? (
            <Text style={styles.variant}>{selected.variant_name}</Text>
          ) : null}

          <View style={styles.stockBanner}>
            <Text style={styles.stockLabel}>In stock</Text>
            <Text style={styles.stockValue}>{selected.stock}</Text>
          </View>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={[styles.input, fieldErrors.quantity && styles.inputError]}
            value={quantity}
            onChangeText={(v) => {
              setQuantity(v);
              setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
            }}
            keyboardType="number-pad"
            selectTextOnFocus
            editable={!saving}
          />
          {fieldErrors.quantity ? (
            <Text style={styles.fieldError}>{fieldErrors.quantity}</Text>
          ) : null}

          <Text style={styles.fieldLabel}>Selling price per unit (₹)</Text>
          <TextInput
            style={[styles.input, fieldErrors.unitPrice && styles.inputError]}
            value={unitPrice}
            onChangeText={(v) => {
              setUnitPrice(v);
              setFieldErrors((prev) => ({ ...prev, unitPrice: undefined }));
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
            editable={!saving}
          />
          {fieldErrors.unitPrice ? (
            <Text style={styles.fieldError}>{fieldErrors.unitPrice}</Text>
          ) : null}

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{formatINR(totalRevenue)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Est. profit</Text>
              <Text style={[styles.summaryValue, styles.profit]}>
                {formatINR(estimatedProfit)}
              </Text>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Sale</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.flex}>
      <TextInput
        style={styles.search}
        placeholder="Search product..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
        autoFocus
        autoCorrect={false}
      />

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={products.length === 0 ? styles.emptyList : styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.emptyText}>No matching products</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => selectProduct(item)}>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.variant_name ? (
                <Text style={styles.rowVariant}>{item.variant_name}</Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowStock}>Stock: {item.stock}</Text>
              <Text style={styles.rowPrice}>{formatINR(item.selling_price)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 16 },
  search: {
    minHeight: 48,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 16 },
  row: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: { flex: 1, marginRight: 8 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  rowVariant: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowStock: { fontSize: 14, fontWeight: '600', color: '#2563EB', marginBottom: 4 },
  rowPrice: { fontSize: 14, color: '#6B7280' },
  changeProduct: { color: '#2563EB', fontSize: 15, fontWeight: '500', marginBottom: 12 },
  productTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  variant: { fontSize: 16, color: '#6B7280', marginTop: 4, marginBottom: 12 },
  stockBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stockLabel: { fontSize: 15, color: '#6B7280' },
  stockValue: { fontSize: 28, fontWeight: '700', color: '#2563EB' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    color: '#111827',
    marginBottom: 6,
  },
  inputError: { borderColor: '#DC2626' },
  fieldError: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  summaryBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 16, color: '#6B7280' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profit: { color: '#16A34A' },
  error: { color: '#DC2626', marginBottom: 12, fontSize: 14 },
  primaryButton: {
    minHeight: 52,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
