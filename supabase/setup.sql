-- DukaanManager: table grants + RLS policies
-- Run this in Supabase Dashboard → SQL Editor → New query → Run

-- 1) Allow authenticated users to use these tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_members TO authenticated;

-- If you use identity/serial columns, also grant sequences:
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2) Turn on RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- 3) Drop old policies if re-running this script
DROP POLICY IF EXISTS "members can read own membership" ON public.business_members;
DROP POLICY IF EXISTS "members can insert own membership" ON public.business_members;
DROP POLICY IF EXISTS "authenticated can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "members can read their businesses" ON public.businesses;

-- 4) business_members policies
CREATE POLICY "members can read own membership"
ON public.business_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "members can insert own membership"
ON public.business_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5) businesses policies
CREATE POLICY "authenticated can create businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "members can read their businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT business_id
    FROM public.business_members
    WHERE user_id = auth.uid()
  )
);
