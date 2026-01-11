-- Remove unique constraint from order_number to allow duplicate uploads
-- This allows importing the same order multiple times from different exports

-- Drop the unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'sales_orders'
        AND constraint_type = 'UNIQUE'
        AND table_schema = 'public'
        AND constraint_name IN (
            SELECT constraint_name
            FROM information_schema.key_column_usage
            WHERE table_name = 'sales_orders'
            AND column_name = 'order_number'
        )
    ) THEN
        ALTER TABLE sales_orders DROP CONSTRAINT sales_orders_order_number_key;
        RAISE NOTICE 'Unique constraint on order_number dropped successfully';
    ELSE
        RAISE NOTICE 'No unique constraint found on order_number';
    END IF;
END $$;

-- Recreate index without unique constraint for better query performance
DROP INDEX IF EXISTS idx_sales_orders_order_number;
CREATE INDEX idx_sales_orders_order_number ON sales_orders(order_number);

-- Add comment to document the change
COMMENT ON COLUMN sales_orders.order_number IS 'Order number can have duplicates for multiple imports of the same order';

-- Create a function to handle duplicate order detection if needed
CREATE OR REPLACE FUNCTION get_order_import_count(p_order_number TEXT, p_user_id TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM sales_orders
        WHERE order_number = p_order_number
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_order_import_count TO authenticated;