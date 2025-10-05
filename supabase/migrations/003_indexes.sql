-- Database Indexes Setup

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_shops_user_id ON shops(user_id);
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

-- Indexes for new tables
CREATE INDEX idx_payables_user_id ON payables(user_id);
CREATE INDEX idx_payables_shop_id ON payables(shop_id);
CREATE INDEX idx_receivables_user_id ON receivables(user_id);
CREATE INDEX idx_receivables_shop_id ON receivables(shop_id);
CREATE INDEX idx_payroll_user_id ON payroll(user_id);
CREATE INDEX idx_payroll_shop_id ON payroll(shop_id);
CREATE INDEX idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX idx_cash_advances_user_id ON cash_advances(user_id);
CREATE INDEX idx_cash_advances_shop_id ON cash_advances(shop_id);
CREATE INDEX idx_cash_advances_employee_id ON cash_advances(employee_id);
CREATE INDEX idx_cash_advances_is_repaid ON cash_advances(is_repaid);
CREATE INDEX idx_cash_advances_created_at ON cash_advances(created_at);