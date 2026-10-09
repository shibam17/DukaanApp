export type Business = {
  id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  created_at: string;
};

export type BusinessMember = {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'employee';
  created_at: string;
};

export type Category = {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  variant_name: string | null;
  sku: string | null;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  business_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  created_by: string;
  created_at: string;
};

export type Purchase = {
  id: string;
  business_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier_name: string | null;
  created_by: string;
  created_at: string;
};

export type StockMovement = {
  id: string;
  business_id: string;
  product_id: string;
  type: 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  reference_id: string | null;
  created_by: string;
  created_at: string;
};
