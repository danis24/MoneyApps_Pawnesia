import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Check if columns already exist by testing the table structure
    const { data: testData, error: testError } = await supabase
      .from('sales_orders')
      .select('admin_fee, service_fee, processing_fee')
      .limit(1)

    // If we get a specific error about missing columns, we need to provide SQL
    if (testError && testError.message.includes('column "admin_fee" does not exist')) {
      const sqlToRun = `
-- Add individual transaction fee columns to sales_orders table
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS admin_fee DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(12,2);

-- Add comments to document the new columns
COMMENT ON COLUMN sales_orders.admin_fee IS 'Biaya administrasi dari data Shopee Excel';
COMMENT ON COLUMN sales_orders.service_fee IS 'Biaya layanan dari data Shopee Excel';
COMMENT ON COLUMN sales_orders.processing_fee IS 'Biaya proses pesanan dari data Shopee Excel';

-- Create index for better query performance on the new columns
CREATE INDEX IF NOT EXISTS idx_sales_orders_transaction_fees ON sales_orders(admin_fee, service_fee, processing_fee);

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
      `

      return NextResponse.json({
        success: false,
        message: 'Database migration required',
        details: 'The transaction fee columns do not exist. Please run the following SQL in the Supabase SQL Editor:',
        sql: sqlToRun.trim()
      })
    }

    // If no error or different error, columns might already exist
    return NextResponse.json({
      success: true,
      message: 'Transaction fee columns already exist or are accessible'
    })

  } catch (error) {
    console.error('Error in add-transaction-fees:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}