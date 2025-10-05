-- Row Level Security (RLS) Policies Setup

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
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Users can view payables" ON payables FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert payables" ON payables FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update payables" ON payables FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete payables" ON payables FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Receivables RLS Policies
CREATE POLICY "Users can view receivables" ON receivables FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert receivables" ON receivables FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update receivables" ON receivables FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete receivables" ON receivables FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Payroll RLS Policies
CREATE POLICY "Users can view payroll" ON payroll FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert payroll" ON payroll FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update payroll" ON payroll FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete payroll" ON payroll FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Cash Advances RLS Policies
CREATE POLICY "Users can view cash_advances" ON cash_advances FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can insert cash_advances" ON cash_advances FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can update cash_advances" ON cash_advances FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);
CREATE POLICY "Users can delete cash_advances" ON cash_advances FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);