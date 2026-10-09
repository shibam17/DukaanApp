import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBusiness } from '../../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
import { formatINR } from '../../utils/format';
import { groupByDate } from '../../utils/dateRanges';
import { fetchProfileNames } from '../../utils/profiles';

type SaleRow = Sale & {
  products: { name: string; variant_name: string | null } | null;
};

export default function SalesHistoryScreen() {
  const { business } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<{ title: string; data: SaleRow[] }[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!business?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('sales')
      .select('*, products(name, variant_name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error.message);
      setSections([]);
      setLoading(false);
      return;
    }

    const rows = (data as SaleRow[]) ?? [];
    const profileMap = await fetchProfileNames(rows.map((r) => r.created_by));
    setNames(profileMap);
    setSections(groupByDate(rows));
    setLoading(false);
  }, [business?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No sales recorded yet</Text>
      }
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
      renderItem={({ item }) => {
        const product = item.products;
        return (
          <View style={styles.card}>
            <Text style={styles.productName}>
              {product?.name ?? 'Product'}
              {product?.variant_name ? ` · ${product.variant_name}` : ''}
            </Text>
            <Text style={styles.meta}>
              Qty {item.quantity} × {formatINR(item.unit_price)} · Revenue{' '}
              {formatINR(item.total_revenue)}
            </Text>
            <Text style={styles.profit}>Profit {formatINR(item.total_profit)}</Text>
            <Text style={styles.by}>Recorded by {names.get(item.created_by) ?? '—'}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 16 },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  productName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 14, color: '#6B7280', marginTop: 6 },
  profit: { fontSize: 14, fontWeight: '600', color: '#16A34A', marginTop: 4 },
  by: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
});
