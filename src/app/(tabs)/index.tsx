import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';
import { getDateRange } from '../../utils/dateRanges';
import { formatINR, formatTimeAgo } from '../../utils/format';

type RecentSaleRow = {
  id: string;
  quantity: number;
  total_revenue: number;
  created_at: string;
  products: { name: string; variant_name: string | null } | null;
};

type RecentPurchaseRow = {
  id: string;
  quantity: number;
  total_cost: number;
  created_at: string;
  products: { name: string; variant_name: string | null } | null;
};

type ActivityItem = {
  id: string;
  kind: 'sale' | 'purchase';
  productName: string;
  quantity: number;
  amount: number;
  createdAt: string;
};

type DashboardData = {
  todayRevenue: number;
  todayProfit: number;
  salesCount: number;
  purchasesCount: number;
  productCount: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recent: ActivityItem[];
};

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function emptyData(): DashboardData {
  return {
    todayRevenue: 0,
    todayProfit: 0,
    salesCount: 0,
    purchasesCount: 0,
    productCount: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    recent: [],
  };
}

export default function DashboardScreen() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyData());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'there';

  const load = useCallback(async () => {
    if (!business?.id) return;

    setError(null);
    const { start, end } = getDateRange('today');
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const [salesToday, purchasesToday, productsResult, recentSales, recentPurchases] =
      await Promise.all([
        supabase
          .from('sales')
          .select('total_revenue, total_profit')
          .eq('business_id', business.id)
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase
          .from('purchases')
          .select('id')
          .eq('business_id', business.id)
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase
          .from('products')
          .select('stock, purchase_price, low_stock_threshold, is_active')
          .eq('business_id', business.id)
          .eq('is_active', true),
        supabase
          .from('sales')
          .select('id, quantity, total_revenue, created_at, products(name, variant_name)')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('purchases')
          .select('id, quantity, total_cost, created_at, products(name, variant_name)')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    if (
      salesToday.error ||
      purchasesToday.error ||
      productsResult.error ||
      recentSales.error ||
      recentPurchases.error
    ) {
      setError(
        salesToday.error?.message ||
          purchasesToday.error?.message ||
          productsResult.error?.message ||
          recentSales.error?.message ||
          recentPurchases.error?.message ||
          'Failed to load dashboard',
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let todayRevenue = 0;
    let todayProfit = 0;
    for (const row of salesToday.data ?? []) {
      todayRevenue += Number(row.total_revenue);
      todayProfit += Number(row.total_profit);
    }

    const products = (productsResult.data as Pick<
      Product,
      'stock' | 'purchase_price' | 'low_stock_threshold' | 'is_active'
    >[]) ?? [];

    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const p of products) {
      inventoryValue += Number(p.stock) * Number(p.purchase_price);
      if (p.stock <= 0) outOfStockCount += 1;
      else if (p.stock <= p.low_stock_threshold) lowStockCount += 1;
    }

    const saleItems: ActivityItem[] = ((recentSales.data as unknown as RecentSaleRow[]) ?? []).map(
      (s) => ({
        id: `sale-${s.id}`,
        kind: 'sale' as const,
        productName: s.products?.name
          ? `${s.products.name}${s.products.variant_name ? ` · ${s.products.variant_name}` : ''}`
          : 'Sale',
        quantity: s.quantity,
        amount: Number(s.total_revenue),
        createdAt: s.created_at,
      }),
    );

    const purchaseItems: ActivityItem[] = (
      (recentPurchases.data as unknown as RecentPurchaseRow[]) ?? []
    ).map((p) => ({
      id: `purchase-${p.id}`,
      kind: 'purchase' as const,
      productName: p.products?.name
        ? `${p.products.name}${p.products.variant_name ? ` · ${p.products.variant_name}` : ''}`
        : 'Purchase',
      quantity: p.quantity,
      amount: Number(p.total_cost),
      createdAt: p.created_at,
    }));

    const recent = [...saleItems, ...purchaseItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    setData({
      todayRevenue,
      todayProfit,
      salesCount: salesToday.data?.length ?? 0,
      purchasesCount: purchasesToday.data?.length ?? 0,
      productCount: products.length,
      inventoryValue,
      lowStockCount,
      outOfStockCount,
      recent,
    });

    setLoading(false);
    setRefreshing(false);
  }, [business?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
    >
      <Text style={styles.businessName}>{business?.name ?? 'Your shop'}</Text>
      <Text style={styles.greeting}>
        {greetingForNow()}, {displayName}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Today</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={styles.summaryValueBlue}>{formatINR(data.todayRevenue)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Profit</Text>
            <Text style={styles.summaryValueGreen}>{formatINR(data.todayProfit)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Sales</Text>
            <Text style={styles.summaryValue}>{data.salesCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Purchases</Text>
            <Text style={styles.summaryValue}>{data.purchasesCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.inventoryCard}>
        <Text style={styles.cardTitle}>Inventory</Text>
        <View style={styles.inventoryRow}>
          <View style={styles.inventoryItem}>
            <Text style={styles.summaryLabel}>Products</Text>
            <Text style={styles.summaryValue}>{data.productCount}</Text>
          </View>
          <View style={styles.inventoryItem}>
            <Text style={styles.summaryLabel}>Stock value</Text>
            <Text style={styles.summaryValueBlue}>{formatINR(data.inventoryValue)}</Text>
          </View>
        </View>
        <View style={styles.alertRow}>
          <Pressable
            style={styles.alertChip}
            onPress={() => router.push('/(tabs)/products?stock=low')}
          >
            <Text style={styles.alertLabel}>Low stock</Text>
            <Text style={styles.alertValue}>{data.lowStockCount}</Text>
          </Pressable>
          <Pressable
            style={styles.alertChip}
            onPress={() => router.push('/(tabs)/products?stock=out')}
          >
            <Text style={styles.alertLabel}>Out of stock</Text>
            <Text style={styles.alertValue}>{data.outOfStockCount}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <Pressable style={styles.primaryAction} onPress={() => router.push('/sale/new')}>
        <Text style={styles.primaryActionText}>Record Sale</Text>
      </Pressable>
      <Pressable style={styles.secondaryAction} onPress={() => router.push('/purchase/new')}>
        <Text style={styles.secondaryActionText}>Add Purchase</Text>
      </Pressable>

      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Pressable onPress={() => router.push('/(tabs)/sales')}>
          <Text style={styles.viewAll}>View All</Text>
        </Pressable>
      </View>

      {data.recent.length === 0 ? (
        <Text style={styles.emptyRecent}>No sales or purchases yet</Text>
      ) : (
        data.recent.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <View
              style={[
                styles.activityIcon,
                item.kind === 'sale' ? styles.saleIcon : styles.purchaseIcon,
              ]}
            >
              <Text style={styles.activityIconText}>
                {item.kind === 'sale' ? 'S' : 'P'}
              </Text>
            </View>
            <View style={styles.activityMain}>
              <Text style={styles.activityName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.activityMeta}>
                {item.kind === 'sale' ? 'Sale' : 'Purchase'} · Qty {item.quantity} ·{' '}
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
            <Text
              style={[
                styles.activityAmount,
                item.kind === 'sale' ? styles.saleAmount : styles.purchaseAmount,
              ]}
            >
              {formatINR(item.amount)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  greeting: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inventoryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  summaryValueBlue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  summaryValueGreen: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
  },
  inventoryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inventoryItem: {
    flex: 1,
  },
  alertRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  alertChip: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
  },
  alertLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  alertValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  primaryAction: {
    minHeight: 52,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryAction: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  secondaryActionText: {
    color: '#2563EB',
    fontSize: 17,
    fontWeight: '600',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 10,
  },
  emptyRecent: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  saleIcon: {
    backgroundColor: '#EFF6FF',
  },
  purchaseIcon: {
    backgroundColor: '#F3F4F6',
  },
  activityIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  activityMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  activityMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  saleAmount: {
    color: '#16A34A',
  },
  purchaseAmount: {
    color: '#111827',
  },
});
