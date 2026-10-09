-- Run in Supabase SQL Editor after products/categories/stock_movements tables exist

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_movements TO authenticated;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can manage products" ON public.products;
DROP POLICY IF EXISTS "members can manage categories" ON public.categories;
DROP POLICY IF EXISTS "members can read stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "members can insert stock movements" ON public.stock_movements;

CREATE POLICY "members can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "members can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "members can read stock movements"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "members can insert stock movements"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
  )
);
