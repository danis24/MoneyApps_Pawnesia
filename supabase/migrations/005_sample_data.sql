-- Sample Data Insertion

-- Insert sample categories
INSERT INTO categories (name, description, user_id) VALUES
('Electronics', 'Electronic devices and accessories', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
('Clothing', 'Apparel and fashion items', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
('Food & Beverage', 'Food items and drinks', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
('Office Supplies', 'Stationery and office equipment', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq')
ON CONFLICT (name) DO NOTHING;

-- Insert sample shop
INSERT INTO shops (name, description, user_id) VALUES
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