-- DukaanManager: products, categories, stock_movements
-- Supabase Dashboard → SQL Editor → paste all → Run

-- Tables (safe to re-run)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  variant_name text,
  sku text,
  barcode text,
  purchase_price numeric(12, 2) NOT NULL DEFAULT 0,
  selling_price numeric(12, 2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment')),
  quantity integer NOT NULL,
  reference_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Role access (fixes "permission denied for table products")
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_movements TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
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
