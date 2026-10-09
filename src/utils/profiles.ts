import { supabase } from '../lib/supabase';

export async function fetchProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data } = await supabase.from('profiles').select('id, full_name').in('id', unique);

  for (const row of data ?? []) {
    const profile = row as { id: string; full_name: string | null };
    const name = profile.full_name?.trim();
    if (name) {
      map.set(profile.id, name);
    }
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, 'Staff');
    }
  }

  return map;
}
