-- Drop existing table and policies
DROP TABLE IF EXISTS sales_orders CASCADE;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can insert own sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can update own sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can delete own sales_orders" ON sales_orders;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_sales_orders_order_number;
DROP INDEX IF EXISTS idx_sales_orders_user_id;
DROP INDEX IF EXISTS idx_sales_orders_status;
DROP INDEX IF EXISTS idx_sales_orders_order_date;
DROP INDEX IF EXISTS idx_sales_orders_shop_id;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_sales_orders_updated_at ON sales_orders;

-- Create sales_orders table
CREATE TABLE sales_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  variation TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  operational_cost DECIMAL(12,2) DEFAULT 0,
  net_income DECIMAL(12,2) GENERATED ALWAYS AS (total_payment - shipping_cost) STORED,
  final_income DECIMAL(12,2) GENERATED ALWAYS AS (total_payment - shipping_cost - operational_cost) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
  payment_method TEXT,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  shipping_deadline TIMESTAMP WITH TIME ZONE,
  resi_number TEXT,
  notes TEXT,
  shop_id UUID,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sales_orders table
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sales_orders
CREATE POLICY "Users can view own sales_orders" ON sales_orders
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own sales_orders" ON sales_orders
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own sales_orders" ON sales_orders
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own sales_orders" ON sales_orders
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX idx_sales_orders_order_number ON sales_orders(order_number);
CREATE INDEX idx_sales_orders_user_id ON sales_orders(user_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX idx_sales_orders_shop_id ON sales_orders(shop_id);

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER handle_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Grant permissions
GRANT ALL ON sales_orders TO authenticated;
GRANT ALL ON sales_orders TO service_role;