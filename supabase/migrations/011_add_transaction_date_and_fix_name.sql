-- Add transaction_date column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to set transaction_date from created_at
UPDATE transactions SET transaction_date = created_at WHERE transaction_date IS NULL;