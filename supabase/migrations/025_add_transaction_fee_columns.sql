-- Add individual transaction fee columns to sales_orders table
-- This allows storing the actual fees from Excel data for accurate financial reporting

ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS admin_fee DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(12,2);

-- Add comments to document the new columns
COMMENT ON COLUMN sales_orders.admin_fee IS 'Biaya administrasi dari data Shopee Excel';
COMMENT ON COLUMN sales_orders.service_fee IS 'Biaya layanan dari data Shopee Excel';
COMMENT ON COLUMN sales_orders.processing_fee IS 'Biaya proses pesanan dari data Shopee Excel';

-- Update existing records to calculate and store transaction fees
-- For existing records, estimate transaction fees as a portion of operational_cost
UPDATE sales_orders
SET
    admin_fee = GREATEST(0, operational_cost * 0.375),
    service_fee = GREATEST(0, operational_cost * 0.401),
    processing_fee = GREATEST(0, operational_cost * 0.224)
WHERE admin_fee IS NULL
  AND service_fee IS NULL
  AND processing_fee IS NULL
  AND operational_cost > 0;

-- Create index for better query performance on the new columns
CREATE INDEX IF NOT EXISTS idx_sales_orders_transaction_fees ON sales_orders(admin_fee, service_fee, processing_fee);