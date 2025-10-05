-- Create payroll table for tracking employee salary payments
CREATE TABLE IF NOT EXISTS payroll (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'biweekly', 'monthly', 'custom')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL,
  bonus DECIMAL(12,2) DEFAULT 0,
  deduction DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the payroll table
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payroll
CREATE POLICY "Users can view own payroll" ON payroll
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own payroll" ON payroll
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own payroll" ON payroll
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own payroll" ON payroll
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX idx_payroll_user_id ON payroll(user_id);
CREATE INDEX idx_payroll_shop_id ON payroll(shop_id);
CREATE INDEX idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX idx_payroll_period_start ON payroll(period_start);
CREATE INDEX idx_payroll_period_end ON payroll(period_end);
CREATE INDEX idx_payroll_status ON payroll(status);