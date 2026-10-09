export type DateFilterKey = 'today' | 'yesterday' | 'week' | 'month';

export function getDateRange(filter: DateFilterKey): { start: Date; end: Date; label: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (filter) {
    case 'today': {
      const start = startOfDay(now);
      return { start, end: endOfDay(now), label: 'Today' };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y), label: 'Yesterday' };
    }
    case 'week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return { start: startOfDay(start), end: endOfDay(now), label: 'This week' };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: endOfDay(now), label: 'This month' };
    }
  }
}

export function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function groupByDate<T extends { created_at: string }>(
  items: T[],
): { title: string; data: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = formatDateGroup(item.created_at);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}
