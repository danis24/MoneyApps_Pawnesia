-- Add bill_of_materials column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS bill_of_materials JSONB DEFAULT '[]';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_bill_of_materials ON products USING gin(bill_of_materials);