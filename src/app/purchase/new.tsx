import { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { useProductSearch } from '../../hooks/useProductSearch';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';
import { friendlyError } from '../../utils/errors';
import { formatINR } from '../../utils/format';

export default function RecordPurchaseScreen() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { products, allProducts, loading, search, setSearch } =
    useProductSearch(business?.id);

  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ quantity?: string; unitCost?: string }>({});
  const [preselectDone, setPreselectDone] = useState(false);

  const qtyNum = Number(quantity);
  const costNum = Number(unitCost);

  const totalCost = useMemo(() => {
    if (Number.isNaN(qtyNum) || Number.isNaN(costNum)) return 0;
    return qtyNum * costNum;
  }, [qtyNum, costNum]);

  useEffect(() => {
    if (preselectDone || loading || !productId) return;
    const match = allProducts.find((p) => p.id === productId);
    if (match) {
      setSelected(match);
      setQuantity('1');
      setUnitCost(String(match.purchase_price));
      setPreselectDone(true);
    }
  }, [productId, allProducts, loading, preselectDone]);

  const selectProduct = (product: Product) => {
    setSelected(product);
    setQuantity('1');
    setUnitCost(String(product.purchase_price));
    setError(null);
    setFieldErrors({});
  };

  const clearSelection = () => {
    setSelected(null);
    setQuantity('1');
    setUnitCost('');
    setSupplierName('');
    setError(null);
    setFieldErrors({});
  };

  const onSave = async () => {
    if (!business?.id || !user?.id || !selected || saving) return;

    const nextErrors: { quantity?: string; unitCost?: string } = {};

    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      nextErrors.quantity = 'Quantity must be greater than 0';
    }
    if (Number.isNaN(costNum) || costNum < 0) {
      nextErrors.unitCost = 'Unit cost must be 0 or more';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    const { error: rpcError } = await supabase.rpc('record_purchase', {
      p_business_id: business.id,
      p_product_id: selected.id,
      p_quantity: qtyNum,
      p_unit_cost: costNum,
      p_supplier_name: supplierName.trim() || null,
      p_user_id: user.id,
    });

    setSaving(false);

    if (rpcError) {
      setError(friendlyError(rpcError, 'Could not record purchase.'));
      return;
    }

    router.replace('/(tabs)/products');
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
          <Text style={styles.stockHint}>Current stock: {selected.stock}</Text>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={[styles.input, fieldErrors.quantity && styles.inputError]}
            value={quantity}
            onChangeText={(v) => {
              setQuantity(v);
              setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
            }}
            keyboardType="number-pad"
            editable={!saving}
          />
          {fieldErrors.quantity ? (
            <Text style={styles.fieldError}>{fieldErrors.quantity}</Text>
          ) : null}

          <Text style={styles.fieldLabel}>Unit cost (₹)</Text>
          <TextInput
            style={[styles.input, fieldErrors.unitCost && styles.inputError]}
            value={unitCost}
            onChangeText={(v) => {
              setUnitCost(v);
              setFieldErrors((prev) => ({ ...prev, unitCost: undefined }));
            }}
            keyboardType="decimal-pad"
            editable={!saving}
          />
          {fieldErrors.unitCost ? (
            <Text style={styles.fieldError}>{fieldErrors.unitCost}</Text>
          ) : null}

          <Text style={styles.fieldLabel}>Supplier (optional)</Text>
          <TextInput
            style={styles.input}
            value={supplierName}
            onChangeText={setSupplierName}
            placeholder="Supplier name"
            placeholderTextColor="#9CA3AF"
            editable={!saving}
          />

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total cost</Text>
            <Text style={styles.summaryValue}>{formatINR(totalCost)}</Text>
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
              <Text style={styles.primaryButtonText}>Save Purchase</Text>
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
            <Text style={styles.rowStock}>Stock: {item.stock}</Text>
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
  rowStock: { fontSize: 14, color: '#6B7280' },
  changeProduct: { color: '#2563EB', fontSize: 15, fontWeight: '500', marginBottom: 12 },
  productTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  variant: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  stockHint: { fontSize: 14, color: '#6B7280', marginTop: 8, marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
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
    marginBottom: 12,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 16, color: '#6B7280' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  error: { color: '#DC2626', marginBottom: 12, fontSize: 14 },
  primaryButton: {
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
