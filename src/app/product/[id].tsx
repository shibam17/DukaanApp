import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import CategoryPicker from '../../components/CategoryPicker';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import type { Category, Product, StockMovement } from '../../types';
import { friendlyError } from '../../utils/errors';
import { fetchProfileNames } from '../../utils/profiles';

function formatMovementQty(type: StockMovement['type'], quantity: number): {
  label: string;
  positive: boolean;
} {
  const abs = Math.abs(quantity);
  if (type === 'sale') {
    return { label: `-${abs}`, positive: false };
  }
  if (type === 'purchase') {
    return { label: `+${abs}`, positive: true };
  }
  return {
    label: quantity > 0 ? `+${quantity}` : String(quantity),
    positive: quantity >= 0,
  };
}

function typeLabel(type: StockMovement['type']): string {
  if (type === 'sale') return 'Sale';
  if (type === 'purchase') return 'Purchase';
  return 'Adjustment';
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { business } = useBusiness();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    purchasePrice?: string;
    sellingPrice?: string;
    lowStockThreshold?: string;
  }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [recorderNames, setRecorderNames] = useState<Map<string, string>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);

  const [name, setName] = useState('');
  const [variantName, setVariantName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!business?.id || !id) return;

    setLoading(true);
    setError(null);

    const [productResult, categoriesResult, movementsResult] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('business_id', business.id)
        .maybeSingle(),
      supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .order('name'),
      supabase
        .from('stock_movements')
        .select('*, profiles:created_by(full_name)')
        .eq('product_id', id)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false }),
    ]);

    if (productResult.error || !productResult.data) {
      setError(friendlyError(productResult.error, 'Product not found.'));
      setLoading(false);
      return;
    }

    const product = productResult.data as Product;
    setName(product.name);
    setVariantName(product.variant_name ?? '');
    setCategoryId(product.category_id);
    setPurchasePrice(String(product.purchase_price));
    setSellingPrice(String(product.selling_price));
    setStock(product.stock);
    setLowStockThreshold(String(product.low_stock_threshold));
    setUpdatedAt(product.updated_at);
    setCategories((categoriesResult.data as Category[]) ?? []);

    type MovementRow = StockMovement & {
      profiles?: { full_name: string | null } | null;
    };

    let movementRows: MovementRow[] = [];
    if (movementsResult.error) {
      const fallback = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', id)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      movementRows = (fallback.data as MovementRow[]) ?? [];
    } else {
      movementRows = (movementsResult.data as MovementRow[]) ?? [];
    }

    setMovements(movementRows);
    const names = await fetchProfileNames(movementRows.map((m) => m.created_by));
    for (const row of movementRows) {
      const joined = row.profiles?.full_name?.trim();
      if (joined) names.set(row.created_by, joined);
    }
    const myName = (user?.user_metadata?.full_name as string | undefined)?.trim();
    if (user?.id && myName) {
      names.set(user.id, myName);
    }
    setRecorderNames(names);
    setLoading(false);
  }, [business?.id, id, user?.id, user?.user_metadata?.full_name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const onSave = async () => {
    if (!business?.id || !id || saving) return;

    const trimmedName = name.trim();
    const purchase = Number(purchasePrice);
    const selling = Number(sellingPrice);
    const threshold = Number(lowStockThreshold);
    const nextErrors: typeof fieldErrors = {};

    if (!trimmedName) nextErrors.name = 'Product name is required';
    if (Number.isNaN(purchase) || purchase < 0) {
      nextErrors.purchasePrice = 'Purchase price must be 0 or more';
    }
    if (Number.isNaN(selling) || selling < 0) {
      nextErrors.sellingPrice = 'Selling price must be 0 or more';
    }
    if (Number.isNaN(threshold) || threshold < 0) {
      nextErrors.lowStockThreshold = 'Threshold must be 0 or more';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(null);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSaving(true);

    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: trimmedName,
        variant_name: variantName.trim() || null,
        category_id: categoryId,
        purchase_price: purchase,
        selling_price: selling,
        low_stock_threshold: threshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', business.id);

    setSaving(false);

    if (updateError) {
      setError(friendlyError(updateError));
      return;
    }

    router.replace('/(tabs)/products');
  };

  const onDeactivate = async () => {
    if (!business?.id || !id) return;

    setDeactivating(true);
    setError(null);

    const { error: deactivateError } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', business.id);

    setDeactivating(false);

    if (deactivateError) {
      setError(deactivateError.message);
      setConfirmDeactivate(false);
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Edit Product', headerBackTitle: 'Back' }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {updatedAt ? (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(updatedAt).toLocaleString()}
          </Text>
        ) : null}

        <View style={styles.stockBanner}>
          <Text style={styles.stockLabel}>Current Stock</Text>
          <Text style={styles.stockValue}>{stock}</Text>
          <Text style={styles.stockHint}>
            Updated via sales & purchases — not editable here
          </Text>
        </View>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={[styles.input, fieldErrors.name && styles.inputError]}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

        <Text style={styles.label}>Variant Name</Text>
        <TextInput
          style={styles.input}
          value={variantName}
          onChangeText={setVariantName}
          placeholder="Optional"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />

        <Text style={styles.label}>Category</Text>
        <Pressable style={styles.input} onPress={() => setPickerOpen(true)}>
          <Text style={selectedCategory ? styles.inputText : styles.placeholder}>
            {selectedCategory?.name ?? 'Select category'}
          </Text>
        </Pressable>

        <Text style={styles.label}>Purchase Price (₹)</Text>
        <TextInput
          style={[styles.input, fieldErrors.purchasePrice && styles.inputError]}
          value={purchasePrice}
          onChangeText={(v) => {
            setPurchasePrice(v);
            setFieldErrors((prev) => ({ ...prev, purchasePrice: undefined }));
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        {fieldErrors.purchasePrice ? (
          <Text style={styles.fieldError}>{fieldErrors.purchasePrice}</Text>
        ) : null}

        <Text style={styles.label}>Selling Price (₹)</Text>
        <TextInput
          style={[styles.input, fieldErrors.sellingPrice && styles.inputError]}
          value={sellingPrice}
          onChangeText={(v) => {
            setSellingPrice(v);
            setFieldErrors((prev) => ({ ...prev, sellingPrice: undefined }));
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        {fieldErrors.sellingPrice ? (
          <Text style={styles.fieldError}>{fieldErrors.sellingPrice}</Text>
        ) : null}

        <Text style={styles.label}>Low Stock Threshold</Text>
        <TextInput
          style={[styles.input, fieldErrors.lowStockThreshold && styles.inputError]}
          value={lowStockThreshold}
          onChangeText={(v) => {
            setLowStockThreshold(v);
            setFieldErrors((prev) => ({ ...prev, lowStockThreshold: undefined }));
          }}
          keyboardType="number-pad"
          placeholder="10"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        {fieldErrors.lowStockThreshold ? (
          <Text style={styles.fieldError}>{fieldErrors.lowStockThreshold}</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={onSave}
          disabled={saving || deactivating}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>Stock Movement History</Text>
        {movements.length === 0 ? (
          <Text style={styles.emptyHistory}>No stock movements yet.</Text>
        ) : (
          movements.map((movement) => {
            const qty = formatMovementQty(movement.type, movement.quantity);
            return (
              <View key={movement.id} style={styles.movementRow}>
                <View style={styles.movementMain}>
                  <Text style={styles.movementType}>{typeLabel(movement.type)}</Text>
                  <Text style={styles.movementDate}>
                    {new Date(movement.created_at).toLocaleString()}
                  </Text>
                  <Text style={styles.movementBy}>
                    by {recorderNames.get(movement.created_by) ?? '—'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.movementQty,
                    qty.positive ? styles.qtyPositive : styles.qtyNegative,
                  ]}
                >
                  {qty.label}
                </Text>
              </View>
            );
          })
        )}

        {confirmDeactivate ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Deactivate this product?</Text>
            <Text style={styles.confirmBody}>
              It will be hidden from your product list. You can still see past sales for it.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancel}
                onPress={() => setConfirmDeactivate(false)}
                disabled={deactivating}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmYes, deactivating && styles.buttonDisabled]}
                onPress={onDeactivate}
                disabled={deactivating}
              >
                {deactivating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteText}>Deactivate</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[styles.deleteButton, deactivating && styles.buttonDisabled]}
            onPress={() => setConfirmDeactivate(true)}
            disabled={saving || deactivating}
          >
            <Text style={styles.deleteText}>Deactivate Product</Text>
          </Pressable>
        )}
      </ScrollView>

      {business?.id ? (
        <CategoryPicker
          visible={pickerOpen}
          businessId={business.id}
          categories={categories}
          selectedId={categoryId}
          onClose={() => setPickerOpen(false)}
          onSelect={setCategoryId}
          onCategoriesChange={setCategories}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  stockBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stockLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2563EB',
  },
  stockHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    fontSize: 16,
    color: '#111827',
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
  },
  inputText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
    marginTop: 8,
    fontSize: 14,
  },
  saveButton: {
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteButton: {
    minHeight: 48,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyHistory: {
    color: '#6B7280',
    fontSize: 14,
  },
  movementRow: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movementMain: {
    flex: 1,
    marginRight: 12,
  },
  movementType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  movementDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  movementBy: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  movementQty: {
    fontSize: 18,
    fontWeight: '700',
  },
  qtyPositive: {
    color: '#16A34A',
  },
  qtyNegative: {
    color: '#DC2626',
  },
  confirmBox: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  confirmBody: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancel: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmYes: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
