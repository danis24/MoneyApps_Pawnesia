-- Complete MoneyApps Database Migration
-- Execute this entire script in Supabase dashboard

-- Drop existing tables if they exist (for clean installation)
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS stock_history CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS finance_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Part 1: Initial Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create core tables
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  channel TEXT DEFAULT 'offline',
  is_active BOOLEAN DEFAULT true,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  sku TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity_on_hand DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_stock DECIMAL(12,2) DEFAULT 0,
  min_stock DECIMAL(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  sku TEXT UNIQUE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE finance_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  platform_fee DECIMAL(12,2) DEFAULT 0,
  shipping_fee DECIMAL(12,2) DEFAULT 0,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stock_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity DECIMAL(12,2) NOT NULL,
  previous_quantity DECIMAL(12,2) NOT NULL,
  new_quantity DECIMAL(12,2) NOT NULL,
  reason TEXT,
  user_id TEXT NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  position TEXT,
  salary DECIMAL(12,2),
  hire_date DATE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date TIMESTAMP WITH TIME ZONE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE receivables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_collected BOOLEAN DEFAULT false,
  collected_date TIMESTAMP WITH TIME ZONE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Part 2: RLS Policies
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Shops RLS Policies
CREATE POLICY "Users can view shops" ON shops FOR SELECT USING (true);
CREATE POLICY "Users can insert own shops" ON shops FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update own shops" ON shops FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete own shops" ON shops FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Categories RLS Policies
CREATE POLICY "Users can view categories" ON categories FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert categories" ON categories FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update categories" ON categories FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Products RLS Policies
CREATE POLICY "Users can view products" ON products FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert products" ON products FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update products" ON products FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete products" ON products FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Materials RLS Policies
CREATE POLICY "Users can view materials" ON materials FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert materials" ON materials FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update materials" ON materials FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete materials" ON materials FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Finance Categories RLS Policies
CREATE POLICY "Users can view finance categories" ON finance_categories FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert finance categories" ON finance_categories FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update finance categories" ON finance_categories FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete finance categories" ON finance_categories FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Transactions RLS Policies
CREATE POLICY "Users can view transactions" ON transactions FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert transactions" ON transactions FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update transactions" ON transactions FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete transactions" ON transactions FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Sales RLS Policies
CREATE POLICY "Users can view sales" ON sales FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert sales" ON sales FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update sales" ON sales FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete sales" ON sales FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Sale Items RLS Policies
CREATE POLICY "Users can view sale items" ON sale_items FOR SELECT USING (true);
CREATE POLICY "Users can insert sale items" ON sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sale items" ON sale_items FOR UPDATE USING (true);
CREATE POLICY "Users can delete sale items" ON sale_items FOR DELETE USING (true);

-- Stock History RLS Policies
CREATE POLICY "Users can view stock history" ON stock_history FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert stock history" ON stock_history FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update stock history" ON stock_history FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Employees RLS Policies
CREATE POLICY "Users can view employees" ON employees FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert employees" ON employees FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update employees" ON employees FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete employees" ON employees FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Payables RLS Policies
CREATE POLICY "Users can view own payables" ON payables FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert own payables" ON payables FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update own payables" ON payables FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete own payables" ON payables FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Receivables RLS Policies
CREATE POLICY "Users can view own receivables" ON receivables FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert own receivables" ON receivables FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update own receivables" ON receivables FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete own receivables" ON receivables FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Part 3: Indexes
-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_shops_user_id ON shops(owner_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_materials_user_id ON materials(user_id);
CREATE INDEX idx_materials_shop_id ON materials(shop_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_finance_categories_user_id ON finance_categories(user_id);
CREATE INDEX idx_finance_categories_shop_id ON finance_categories(shop_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_shop_id ON sales(shop_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_stock_history_user_id ON stock_history(user_id);
CREATE INDEX idx_stock_history_product_id ON stock_history(product_id);
CREATE INDEX idx_stock_history_material_id ON stock_history(material_id);
CREATE INDEX idx_stock_history_shop_id ON stock_history(shop_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_shop_id ON employees(shop_id);
CREATE INDEX idx_payables_user_id ON payables(user_id);
CREATE INDEX idx_payables_shop_id ON payables(shop_id);
CREATE INDEX idx_payables_due_date ON payables(due_date);
CREATE INDEX idx_payables_is_paid ON payables(is_paid);
CREATE INDEX idx_receivables_user_id ON receivables(user_id);
CREATE INDEX idx_receivables_shop_id ON receivables(shop_id);
CREATE INDEX idx_receivables_due_date ON receivables(due_date);
CREATE INDEX idx_receivables_is_collected ON receivables(is_collected);

-- Part 4: Triggers
-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_finance_categories_updated_at BEFORE UPDATE ON finance_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sale_items_updated_at BEFORE UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Part 5: Sample Data
-- Insert sample categories
INSERT INTO categories (name, description, user_id) VALUES
('Electronics', 'Electronic devices and accessories', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
('Clothing', 'Apparel and fashion items', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
('Food & Beverage', 'Food items and drinks', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
('Office Supplies', 'Stationery and office equipment', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq')
ON CONFLICT (name) DO NOTHING;

-- Insert sample shop
INSERT INTO shops (name, description, owner_id) VALUES
('Demo Shop', 'Sample shop for demonstration', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq')
ON CONFLICT DO NOTHING;

-- Insert sample products (if shop exists)
INSERT INTO products (name, description, price, stock_quantity, category_id, shop_id, user_id, sku)
SELECT
  'Laptop Pro',
  'High-performance laptop for professionals',
  15000000.00,
  10,
  c.id,
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq',
  'PROD-LAPTOP-001'
FROM categories c, shops s
WHERE c.name = 'Electronics' AND s.name = 'Demo Shop'
LIMIT 1;

INSERT INTO products (name, description, price, stock_quantity, category_id, shop_id, user_id, sku)
SELECT
  'Wireless Mouse',
  'Ergonomic wireless mouse',
  250000.00,
  50,
  c.id,
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq',
  'PROD-MOUSE-002'
FROM categories c, shops s
WHERE c.name = 'Electronics' AND s.name = 'Demo Shop'
LIMIT 1;

-- Insert sample materials (if shop exists)
INSERT INTO materials (name, description, unit_cost, unit_price, current_stock, min_stock, unit, shop_id, user_id, sku)
SELECT
  'USB Cable',
  'High-quality USB cable',
  15000.00,
  25000.00,
  100.00,
  20.00,
  'pcs',
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq',
  'MAT-CABLE-001'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

INSERT INTO materials (name, description, unit_cost, unit_price, current_stock, min_stock, unit, shop_id, user_id, sku)
SELECT
  'Packaging Box',
  'Small cardboard boxes for shipping',
  2000.00,
  3000.00,
  200.00,
  50.00,
  'pcs',
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq',
  'MAT-BOX-002'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

-- Insert sample finance categories (if shop exists)
INSERT INTO finance_categories (name, type, description, shop_id, user_id)
SELECT
  'Sales Revenue',
  'income',
  'Revenue from product sales',
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

INSERT INTO finance_categories (name, type, description, shop_id, user_id)
SELECT
  'Office Supplies',
  'expense',
  'Expenses for office supplies',
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

-- Migration completed successfully