-- ============================================================
-- Atelier ERP — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_phone TEXT,
  items JSONB DEFAULT '[]',
  fabric_type TEXT,
  color TEXT,
  dimensions TEXT,
  weight TEXT,
  labor_cost DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  order_date DATE,
  delivery_date DATE,
  advance_payment DECIMAL DEFAULT 0,
  remaining_amount DECIMAL DEFAULT 0,
  total_price DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]',
  labor_cost DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  total_price DECIMAL DEFAULT 0,
  converted_to_invoice BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  related_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]',
  labor_cost DECIMAL DEFAULT 0,
  notes TEXT,
  total_amount DECIMAL DEFAULT 0,
  paid_amount DECIMAL DEFAULT 0,
  remaining_amount DECIMAL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  due_date DATE,
  payment_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  supplier TEXT,
  quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  cost_price DECIMAL DEFAULT 0,
  selling_price DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'available',
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workers (Craftsmen)
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  task_type TEXT,
  task_price DECIMAL DEFAULT 0,
  completed_quantity DECIMAL DEFAULT 0,
  paid_amount DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  product TEXT,
  category TEXT DEFAULT 'other',
  total_amount DECIMAL DEFAULT 0,
  paid_amount DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  category TEXT DEFAULT 'other',
  amount DECIMAL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- History / Audit Log
CREATE TABLE IF NOT EXISTS history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  user_name TEXT,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings (singleton row with id = 1)
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  company_name TEXT DEFAULT 'Atelier',
  company_email TEXT DEFAULT 'contact@atelier.ma',
  company_phone TEXT,
  company_address TEXT,
  company_city TEXT DEFAULT 'Casablanca',
  ice TEXT,
  rc TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1A1714',
  secondary_color TEXT DEFAULT '#B8936A',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO company_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- Row Level Security (RLS) — authenticated users full access
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON clients         FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON orders          FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON quotes          FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON invoices        FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON products        FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON stock_movements FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON workers         FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON suppliers       FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON expenses        FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON history         FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON company_settings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Storage Buckets (run separately or via Supabase dashboard)
-- ============================================================
-- Create two public storage buckets:
--   1. "products"  — for product images
--   2. "logos"     — for company logos
--
-- In Supabase Dashboard → Storage → New bucket:
--   Name: products, Public: true
--   Name: logos, Public: true
