-- Create cash advances table for tracking employee cash advances/loans
CREATE TABLE IF NOT EXISTS cash_advances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  is_repaid BOOLEAN DEFAULT false,
  repayment_amount DECIMAL(12,2) DEFAULT 0,
  repayment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the cash_advances table
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cash_advances
CREATE POLICY "Users can view own cash_advances" ON cash_advances
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own cash_advances" ON cash_advances
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own cash_advances" ON cash_advances
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own cash_advances" ON cash_advances
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX idx_cash_advances_user_id ON cash_advances(user_id);
CREATE INDEX idx_cash_advances_shop_id ON cash_advances(shop_id);
CREATE INDEX idx_cash_advances_employee_id ON cash_advances(employee_id);
CREATE INDEX idx_cash_advances_is_repaid ON cash_advances(is_repaid);
CREATE INDEX idx_cash_advances_created_at ON cash_advances(created_at);