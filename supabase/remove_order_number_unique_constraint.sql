-- Remove unique constraint from order_number to allow duplicate uploads
-- Run this in the Supabase SQL Editor

-- Drop the unique constraint on order_number
DO $$
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'sales_orders'
        AND constraint_name LIKE '%unique%'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales_orders DROP CONSTRAINT sales_orders_order_number_key;
        RAISE NOTICE 'Unique constraint on order_number dropped successfully';
    ELSE
        RAISE NOTICE 'No unique constraint found on order_number';
    END IF;
END $$;

-- Create a new index without unique constraint for performance
DROP INDEX IF EXISTS idx_sales_orders_order_number;
CREATE INDEX idx_sales_orders_order_number ON sales_orders(order_number);

-- Add a comment to document the change
COMMENT ON TABLE sales_orders IS 'Sales orders table - order_number can have duplicates for multiple uploads of the same order';

-- Verify the constraint has been removed
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'sales_orders'
AND tc.table_schema = 'public'
AND kcu.column_name = 'order_number';