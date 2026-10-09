import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { Business, BusinessMember } from '../types';

type BusinessRole = BusinessMember['role'];

type BusinessContextValue = {
  business: Business | null;
  role: BusinessRole | null;
  loading: boolean;
  createBusiness: (name: string) => Promise<{ business: Business | null; error: Error | null }>;
  refreshBusiness: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

function useBusinessState(userId: string | undefined): BusinessContextValue {
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<BusinessRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMembership = useCallback(async () => {
    if (!userId) {
      setBusiness(null);
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('business_members')
      .select('role, businesses(*)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to load business membership:', error.message);
      setBusiness(null);
      setRole(null);
      setLoading(false);
      return;
    }

    if (data?.businesses) {
      const joined = data.businesses as unknown as Business | Business[];
      const nextBusiness = Array.isArray(joined) ? joined[0] ?? null : joined;
      setBusiness(nextBusiness);
      setRole(data.role as BusinessRole);
    } else {
      setBusiness(null);
      setRole(null);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  const createBusiness = useCallback(
    async (name: string): Promise<{ business: Business | null; error: Error | null }> => {
      if (!userId) {
        return { business: null, error: new Error('You must be signed in to create a shop.') };
      }

      const trimmed = name.trim();
      if (!trimmed) {
        return { business: null, error: new Error('Please enter a shop name.') };
      }

      const { data: newBusiness, error: businessError } = await supabase
        .from('businesses')
        .insert({ name: trimmed })
        .select()
        .single();

      if (businessError || !newBusiness) {
        return {
          business: null,
          error: new Error(businessError?.message ?? 'Could not create shop.'),
        };
      }

      const { error: memberError } = await supabase.from('business_members').insert({
        business_id: newBusiness.id,
        user_id: userId,
        role: 'owner',
      });

      if (memberError) {
        return { business: null, error: new Error(memberError.message) };
      }

      const created = newBusiness as Business;
      setBusiness(created);
      setRole('owner');
      return { business: created, error: null };
    },
    [userId],
  );

  return useMemo(
    () => ({
      business,
      role,
      loading,
      createBusiness,
      refreshBusiness: fetchMembership,
    }),
    [business, role, loading, createBusiness, fetchMembership],
  );
}

type BusinessProviderProps = {
  userId: string;
  children: ReactNode;
};

export function BusinessProvider({ userId, children }: BusinessProviderProps) {
  const value = useBusinessState(userId);
  return createElement(BusinessContext.Provider, { value }, children);
}

export function useBusiness(): BusinessContextValue {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
