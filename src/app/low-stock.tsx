import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useBusiness } from '../hooks/useBusiness';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { friendlyError } from '../utils/errors';

export default function LowStockScreen() {
  const { business } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business?.id) return;

    setError(null);

    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true);

    if (fetchError) {
      setError(friendlyError(fetchError));
      setProducts([]);
    } else {
      const rows = ((data as Product[]) ?? []).filter(
        (p) => p.stock <= p.low_stock_threshold,
      );
      setProducts(rows);
    }

    setLoading(false);
    setRefreshing(false);
  }, [business?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const aOut = a.stock <= 0 ? 0 : 1;
      const bOut = b.stock <= 0 ? 0 : 1;
      if (aOut !== bOut) return aOut - bOut;

      const aRatio = a.low_stock_threshold > 0 ? a.stock / a.low_stock_threshold : 0;
      const bRatio = b.low_stock_threshold > 0 ? b.stock / b.low_stock_threshold : 0;
      return aRatio - bRatio;
    });
  }, [products]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Low Stock' }} />
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Low Stock' }} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sorted.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All products are well stocked!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const reorderQty = Math.max(item.low_stock_threshold - item.stock, 0);
          const out = item.stock <= 0;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardMain}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.variant_name ? (
                    <Text style={styles.variant}>{item.variant_name}</Text>
                  ) : null}
                  <Text style={[styles.status, out && styles.statusOut]}>
                    {out ? 'Out of stock' : 'Low stock'}
                  </Text>
                </View>
                <Pressable
                  style={styles.purchaseBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/purchase/new',
                      params: { productId: item.id },
                    })
                  }
                >
                  <Text style={styles.purchaseBtnText}>Add Purchase</Text>
                </Pressable>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>Stock: {item.stock}</Text>
                <Text style={styles.meta}>Threshold: {item.low_stock_threshold}</Text>
                <Text style={styles.reorder}>Reorder: {reorderQty}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  error: {
    color: '#DC2626',
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 14,
  },
  list: { padding: 16, paddingBottom: 32 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  emptyState: { alignItems: 'center' },
  emptyTitle: { fontSize: 16, color: '#16A34A', fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardMain: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  variant: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600', color: '#DC2626', marginTop: 6 },
  statusOut: { color: '#DC2626' },
  purchaseBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  meta: { fontSize: 13, color: '#6B7280' },
  reorder: { fontSize: 13, fontWeight: '600', color: '#111827' },
});
