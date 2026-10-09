-- Run in Supabase SQL Editor so the app can READ sales/purchases
-- (record_* RPCs can insert even when table SELECT is blocked)

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchases TO authenticated;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can read sales" ON public.sales;
DROP POLICY IF EXISTS "members can read purchases" ON public.purchases;

CREATE POLICY "members can read sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "members can read purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
);

-- If EXECUTE grants fail, ignore — your RPCs already work for inserts.
-- You can grant them manually from Database → Functions if needed.
