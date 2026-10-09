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
import { router } from 'expo-router';
import CategoryPicker from '../../components/CategoryPicker';
import { useBusiness } from '../../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types';
import { friendlyError } from '../../utils/errors';

export default function AddProductScreen() {
  const { business } = useBusiness();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [variantName, setVariantName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    purchasePrice?: string;
    sellingPrice?: string;
    openingStock?: string;
    lowStockThreshold?: string;
  }>({});

  const loadCategories = useCallback(async () => {
    if (!business?.id) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', business.id)
      .order('name');

    setCategories((data as Category[]) ?? []);
  }, [business?.id]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const onSave = async () => {
    if (!business?.id || saving) {
      if (!business?.id) setError('No business selected.');
      return;
    }

    const trimmedName = name.trim();
    const purchase = Number(purchasePrice);
    const selling = Number(sellingPrice);
    const stock = Number(openingStock);
    const threshold = Number(lowStockThreshold);
    const nextErrors: typeof fieldErrors = {};

    if (!trimmedName) nextErrors.name = 'Product name is required';
    if (Number.isNaN(purchase) || purchase < 0) {
      nextErrors.purchasePrice = 'Purchase price must be 0 or more';
    }
    if (Number.isNaN(selling) || selling < 0) {
      nextErrors.sellingPrice = 'Selling price must be 0 or more';
    }
    if (Number.isNaN(stock) || stock < 0) {
      nextErrors.openingStock = 'Opening stock must be 0 or more';
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

    const { error: insertError } = await supabase.from('products').insert({
      business_id: business.id,
      category_id: categoryId,
      name: trimmedName,
      variant_name: variantName.trim() || null,
      purchase_price: purchase,
      selling_price: selling,
      stock,
      low_stock_threshold: threshold,
      is_active: true,
    });

    setSaving(false);

    if (insertError) {
      setError(friendlyError(insertError));
      return;
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={[styles.input, fieldErrors.name && styles.inputError]}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="e.g. Notebook"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

        <Text style={styles.label}>Variant Name</Text>
        <TextInput
          style={styles.input}
          value={variantName}
          onChangeText={setVariantName}
          placeholder="e.g. A4 Ruled (optional)"
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

        <Text style={styles.label}>Opening Stock</Text>
        <TextInput
          style={[styles.input, fieldErrors.openingStock && styles.inputError]}
          value={openingStock}
          onChangeText={(v) => {
            setOpeningStock(v);
            setFieldErrors((prev) => ({ ...prev, openingStock: undefined }));
          }}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        {fieldErrors.openingStock ? (
          <Text style={styles.fieldError}>{fieldErrors.openingStock}</Text>
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
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save Product</Text>
          )}
        </Pressable>
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
  content: {
    padding: 16,
    paddingBottom: 40,
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
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
