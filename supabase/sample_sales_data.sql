-- Sample Sales Data Insertion

-- Insert sample sales data (if shop exists)
INSERT INTO sales (invoice_number, customer_name, customer_email, customer_phone, total_amount, discount_amount, tax_amount, final_amount, payment_method, payment_status, notes, sale_date, platform_fee, shipping_fee, shop_id, user_id)
SELECT
  'INV-2025-001',
  'John Doe',
  'john@example.com',
  '081234567890',
  2500000.00,
  0.00,
  0.00,
  2500000.00,
  'cash',
  'completed',
  'Sample sale for testing',
  '2025-01-08 10:00:00',
  0.00,
  0.00,
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

INSERT INTO sales (invoice_number, customer_name, customer_email, customer_phone, total_amount, discount_amount, tax_amount, final_amount, payment_method, payment_status, notes, sale_date, platform_fee, shipping_fee, shop_id, user_id)
SELECT
  'INV-2025-002',
  'Jane Smith',
  'jane@example.com',
  '081987654321',
  1500000.00,
  150000.00,
  0.00,
  1350000.00,
  'transfer',
  'completed',
  'Another sample sale',
  '2025-01-09 14:30:00',
  0.00,
  25000.00,
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

INSERT INTO sales (invoice_number, customer_name, customer_email, customer_phone, total_amount, discount_amount, tax_amount, final_amount, payment_method, payment_status, notes, sale_date, platform_fee, shipping_fee, shop_id, user_id)
SELECT
  'INV-2025-003',
  'Bob Johnson',
  'bob@example.com',
  '081567891234',
  500000.00,
  0.00,
  0.00,
  500000.00,
  'ewallet',
  'pending',
  'Pending payment',
  '2025-01-10 09:15:00',
  5000.00,
  15000.00,
  s.id,
  'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'
FROM shops s
WHERE s.name = 'Demo Shop'
LIMIT 1;

-- Insert sample Shopee sales orders
INSERT INTO sales_orders (order_number, customer_name, customer_phone, address, city, province, product_name, sku, variation, quantity, unit_price, total_price, shipping_fee, shipping_cost, total_payment, operational_cost, status, payment_method, order_date, payment_date, shipping_deadline, resi_number, notes, user_id)
VALUES
  ('SHOPEE-2025-001', 'Alice Brown', '081234567890', 'Jl. Sudirman No. 123', 'Jakarta', 'DKI Jakarta', 'Laptop Pro', 'PROD-LAPTOP-001', '16GB RAM, 512GB SSD', 1, 15000000.00, 15000000.00, 50000.00, 30000.00, 15050000.00, 10000.00, 'completed', 'ShopeePay', '2025-01-08 10:00:00', '2025-01-08 10:30:00', '2025-01-09 18:00:00', 'RESI123456789', 'Fast shipping requested', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
  ('SHOPEE-2025-002', 'Charlie Wilson', '081987654321', 'Jl. Thamrin No. 456', 'Bandung', 'Jawa Barat', 'Wireless Mouse', 'PROD-MOUSE-002', 'Black', 2, 250000.00, 500000.00, 20000.00, 15000.00, 520000.00, 5000.00, 'shipped', 'COD', '2025-01-09 15:00:00', '2025-01-09 15:00:00', '2025-01-11 20:00:00', 'RESI987654321', 'Handle with care', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
  ('SHOPEE-2025-003', 'Diana Prince', '081567891234', 'Jl. Gatot Subroto No. 789', 'Surabaya', 'Jawa Timur', 'Laptop Pro', 'PROD-LAPTOP-001', '32GB RAM, 1TB SSD', 1, 17000000.00, 17000000.00, 60000.00, 40000.00, 17060000.00, 15000.00, 'pending', 'Transfer Bank', '2025-01-10 11:00:00', NULL, '2025-01-12 18:00:00', NULL, 'Customer request special packaging', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq');