import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // First, let's check if the unique constraint exists
    const { data: constraintCheck, error: checkError } = await supabase
      .from('sales_orders')
      .select('order_number')
      .limit(1)

    if (checkError) {
      console.error('Error checking table:', checkError)
      return NextResponse.json({
        success: false,
        error: 'Failed to check table',
        details: checkError.message
      }, { status: 500 })
    }

    // Since we can't use exec_sql, we'll need to run this manually in the Supabase dashboard
    // For now, let's provide the SQL that needs to be run
    const sqlToRun = `
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
    `

    return NextResponse.json({
      success: false,
      message: 'Manual SQL execution required',
      details: 'The exec_sql function is not available. Please run the following SQL in the Supabase SQL Editor:',
      sql: sqlToRun.trim()
    })

  } catch (error) {
    console.error('Error in remove-order-number-constraint:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}