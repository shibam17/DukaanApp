import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useBusiness } from '../../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import type { Sale } from '../../types';
import { formatINR } from '../../utils/format';
import {
  getDateRange,
  type DateFilterKey,
} from '../../utils/dateRanges';

type SaleRow = Sale & {
  products: { name: string; variant_name: string | null } | null;
};

const FILTERS: { key: DateFilterKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

export default function SalesScreen() {
  const { business } = useBusiness();
  const [filter, setFilter] = useState<DateFilterKey>('today');
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business?.id) return;

    const { start, end } = getDateRange(filter);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('sales')
      .select('*, products(name, variant_name)')
      .eq('business_id', business.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to load sales:', fetchError.message);
      setError(fetchError.message);
      setSales([]);
    } else {
      setSales((data as SaleRow[]) ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [business?.id, filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const stats = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let units = 0;
    for (const s of sales) {
      revenue += Number(s.total_revenue);
      profit += Number(s.total_profit);
      units += s.quantity;
    }
    return { revenue, profit, units };
  }, [sales]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const rangeLabel = getDateRange(filter).label;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{rangeLabel}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={styles.statValue}>{formatINR(stats.revenue)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Profit</Text>
                <Text style={[styles.statValue, styles.profit]}>
                  {formatINR(stats.profit)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Units</Text>
                <Text style={styles.statValue}>{stats.units}</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={sales}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No sales for {rangeLabel.toLowerCase()}</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.products?.name ?? 'Product'}
                  {item.products?.variant_name ? ` · ${item.products.variant_name}` : ''}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.quantity} × {formatINR(item.unit_price)} ={' '}
                  {formatINR(item.total_revenue)}
                </Text>
                <Text style={styles.cardProfit}>Profit {formatINR(item.total_profit)}</Text>
              </View>
            )}
          />
        </>
      )}

      <Pressable style={styles.recordButton} onPress={() => router.push('/sale/new')}>
        <Text style={styles.recordButtonText}>Record Sale</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  error: {
    color: '#DC2626',
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  statsTitle: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 4 },
  profit: { color: '#16A34A' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 24, fontSize: 15 },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  cardProfit: { fontSize: 14, fontWeight: '600', color: '#16A34A', marginTop: 4 },
  recordButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 52,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
