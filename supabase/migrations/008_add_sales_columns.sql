-- Add missing columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE sales ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(12,2) DEFAULT 0;

-- Update existing records to set sale_date from created_at
UPDATE sales SET sale_date = created_at WHERE sale_date IS NULL;