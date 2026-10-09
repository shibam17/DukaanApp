import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useBusiness } from '../../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import type { Category, Product } from '../../types';
import { formatINR } from '../../utils/format';

type ProductRow = Product & {
  categories?: { name: string } | null;
};

type StockFilter = 'all' | 'low' | 'out';

function parseStockParam(value: string | string[] | undefined): StockFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'low' || raw === 'out') return raw;
  return 'all';
}

export default function ProductsScreen() {
  const { business } = useBusiness();
  const params = useLocalSearchParams<{ stock?: string }>();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>(() => parseStockParam(params.stock));
  const [categoryFilter, setCategoryFilter] = useState<string | 'all' | 'uncategorized'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!business?.id) return;

    setError(null);

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(name)')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .order('name'),
    ]);

    if (productsResult.error) {
      setError(productsResult.error.message);
      setProducts([]);
    } else {
      setProducts((productsResult.data as ProductRow[]) ?? []);
    }

    setCategories((categoriesResult.data as Category[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [business?.id]);

  useEffect(() => {
    setStockFilter(parseStockParam(params.stock));
  }, [params.stock]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProducts();
    }, [loadProducts]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = product.categories?.name?.toLowerCase() ?? '';

      if (q) {
        const matchesSearch =
          product.name.toLowerCase().includes(q) ||
          (product.variant_name?.toLowerCase().includes(q) ?? false) ||
          categoryName.includes(q);
        if (!matchesSearch) return false;
      }

      if (stockFilter === 'out' && product.stock > 0) return false;
      if (
        stockFilter === 'low' &&
        !(product.stock > 0 && product.stock <= product.low_stock_threshold)
      ) {
        return false;
      }

      if (categoryFilter === 'uncategorized' && product.category_id) return false;
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'uncategorized' &&
        product.category_id !== categoryFilter
      ) {
        return false;
      }

      return true;
    });
  }, [products, search, stockFilter, categoryFilter]);

  const hasActiveFilters = stockFilter !== 'all' || categoryFilter !== 'all';

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (stockFilter === 'low') parts.push('Low stock');
    if (stockFilter === 'out') parts.push('Out of stock');
    if (categoryFilter === 'uncategorized') parts.push('Uncategorized');
    if (categoryFilter !== 'all' && categoryFilter !== 'uncategorized') {
      const cat = categories.find((c) => c.id === categoryFilter);
      if (cat) parts.push(cat.name);
    }
    return parts.length ? parts.join(' · ') : null;
  }, [stockFilter, categoryFilter, categories]);

  const clearFilters = () => {
    setStockFilter('all');
    setCategoryFilter('all');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const renderStockBadge = (product: ProductRow) => {
    if (product.stock <= 0) {
      return <Text style={styles.badgeDanger}>Out of Stock</Text>;
    }
    if (product.stock <= product.low_stock_threshold) {
      return <Text style={styles.badgeWarning}>Low Stock</Text>;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        <Pressable
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setFilterOpen(true)}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={hasActiveFilters ? '#FFFFFF' : '#2563EB'}
          />
        </Pressable>
      </View>

      {filterLabel ? (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterText} numberOfLines={1}>
            {filterLabel}
          </Text>
          <Pressable onPress={clearFilters} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {products.length === 0 ? 'No products yet' : 'No matching products'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {products.length === 0
                ? 'Tap + to add your first product!'
                : 'Try a different search or filter'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/product/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitles}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.variant_name ? (
                  <Text style={styles.variant} numberOfLines={1}>
                    {item.variant_name}
                  </Text>
                ) : null}
                <Text style={styles.category} numberOfLines={1}>
                  {item.categories?.name ?? 'Uncategorized'}
                </Text>
              </View>
              {renderStockBadge(item)}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.price}>{formatINR(item.selling_price)}</Text>
              <Text style={styles.stock}>Stock: {item.stock}</Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/product/add')}
        accessibilityLabel="Add product"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <Modal visible={filterOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter</Text>

            <Text style={styles.modalSection}>Stock</Text>
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'low', label: 'Low stock' },
                { key: 'out', label: 'Out of stock' },
              ] as const
            ).map((f) => (
              <Pressable
                key={f.key}
                style={styles.modalOption}
                onPress={() => setStockFilter(f.key)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    stockFilter === f.key && styles.modalOptionActive,
                  ]}
                >
                  {f.label}
                </Text>
                {stockFilter === f.key ? (
                  <Text style={styles.check}>✓</Text>
                ) : null}
              </Pressable>
            ))}

            <Text style={[styles.modalSection, styles.modalSectionSpaced]}>Category</Text>
            <ScrollView style={styles.categoryList} keyboardShouldPersistTaps="handled">
              <Pressable
                style={styles.modalOption}
                onPress={() => setCategoryFilter('all')}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    categoryFilter === 'all' && styles.modalOptionActive,
                  ]}
                >
                  All categories
                </Text>
                {categoryFilter === 'all' ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
              <Pressable
                style={styles.modalOption}
                onPress={() => setCategoryFilter('uncategorized')}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    categoryFilter === 'uncategorized' && styles.modalOptionActive,
                  ]}
                >
                  Uncategorized
                </Text>
                {categoryFilter === 'uncategorized' ? (
                  <Text style={styles.check}>✓</Text>
                ) : null}
              </Pressable>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.modalOption}
                  onPress={() => setCategoryFilter(category.id)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      categoryFilter === category.id && styles.modalOptionActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                  {categoryFilter === category.id ? (
                    <Text style={styles.check}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalClear} onPress={clearFilters}>
                <Text style={styles.modalClearText}>Clear</Text>
              </Pressable>
              <Pressable style={styles.modalDone} onPress={() => setFilterOpen(false)}>
                <Text style={styles.modalDoneText}>Done</Text>
              </Pressable>
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
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  search: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  activeFilterText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  error: {
    color: '#DC2626',
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitles: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  variant: {
    marginTop: 2,
    fontSize: 14,
    color: '#6B7280',
  },
  category: {
    marginTop: 6,
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  stock: {
    fontSize: 14,
    color: '#6B7280',
  },
  badgeDanger: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  badgeWarning: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalSection: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalSectionSpaced: {
    marginTop: 16,
  },
  categoryList: {
    maxHeight: 220,
  },
  modalOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  modalOptionActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  check: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalClear: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalDone: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
