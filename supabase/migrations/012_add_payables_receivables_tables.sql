-- Create payables table for tracking debts/hutang
CREATE TABLE IF NOT EXISTS payables (
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

-- Create receivables table for tracking payments receivable/piutang
CREATE TABLE IF NOT EXISTS receivables (
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

-- Enable RLS on the new tables
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payables
CREATE POLICY "Users can view own payables" ON payables
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own payables" ON payables
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own payables" ON payables
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own payables" ON payables
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create RLS policies for receivables
CREATE POLICY "Users can view own receivables" ON receivables
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own receivables" ON receivables
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own receivables" ON receivables
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own receivables" ON receivables
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX idx_payables_user_id ON payables(user_id);
CREATE INDEX idx_payables_shop_id ON payables(shop_id);
CREATE INDEX idx_payables_due_date ON payables(due_date);
CREATE INDEX idx_payables_is_paid ON payables(is_paid);

CREATE INDEX idx_receivables_user_id ON receivables(user_id);
CREATE INDEX idx_receivables_shop_id ON receivables(shop_id);
CREATE INDEX idx_receivables_due_date ON receivables(due_date);
CREATE INDEX idx_receivables_is_collected ON receivables(is_collected);