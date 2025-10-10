import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Check if sales_orders table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('sales_orders')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    if (checkError) {
      // Table doesn't exist, create it
      console.log('Creating sales_orders table...')

      // Create the table using raw SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS sales_orders (
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
            net_income DECIMAL(12,2) GENERATED ALWAYS AS (total_payment - shipping_cost) STORED,
            operational_cost DECIMAL(12,2) DEFAULT 0,
            final_income DECIMAL(12,2) GENERATED ALWAYS AS (net_income - operational_cost) STORED,
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

          -- Enable RLS
          ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

          -- Create RLS policies
          CREATE POLICY "Users can view own sales_orders" ON sales_orders
            FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

          CREATE POLICY "Users can insert own sales_orders" ON sales_orders
            FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

          CREATE POLICY "Users can update own sales_orders" ON sales_orders
            FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

          CREATE POLICY "Users can delete own sales_orders" ON sales_orders
            FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

          -- Insert sample data
          INSERT INTO sales_orders (order_number, customer_name, customer_phone, address, city, province, product_name, sku, variation, quantity, unit_price, total_price, shipping_fee, shipping_cost, total_payment, operational_cost, status, payment_method, order_date, payment_date, shipping_deadline, resi_number, notes, user_id)
          VALUES
            ('SHOPEE-2025-001', 'Alice Brown', '081234567890', 'Jl. Sudirman No. 123', 'Jakarta', 'DKI Jakarta', 'Laptop Pro', 'PROD-LAPTOP-001', '16GB RAM, 512GB SSD', 1, 15000000.00, 15000000.00, 50000.00, 30000.00, 15050000.00, 10000.00, 'completed', 'ShopeePay', '2025-01-08 10:00:00', '2025-01-08 10:30:00', '2025-01-09 18:00:00', 'RESI123456789', 'Fast shipping requested', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
            ('SHOPEE-2025-002', 'Charlie Wilson', '081987654321', 'Jl. Thamrin No. 456', 'Bandung', 'Jawa Barat', 'Wireless Mouse', 'PROD-MOUSE-002', 'Black', 2, 250000.00, 500000.00, 20000.00, 15000.00, 520000.00, 5000.00, 'shipped', 'COD', '2025-01-09 15:00:00', '2025-01-09 15:00:00', '2025-01-11 20:00:00', 'RESI987654321', 'Handle with care', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq'),
            ('SHOPEE-2025-003', 'Diana Prince', '081567891234', 'Jl. Gatot Subroto No. 789', 'Surabaya', 'Jawa Timur', 'Laptop Pro', 'PROD-LAPTOP-001', '32GB RAM, 1TB SSD', 1, 17000000.00, 17000000.00, 60000.00, 40000.00, 17060000.00, 15000.00, 'pending', 'Transfer Bank', '2025-01-10 11:00:00', NULL, '2025-01-12 18:00:00', NULL, 'Customer request special packaging', 'user_33Xhnqa6JLKOAjnCyLo2KTwEiUq')
          ON CONFLICT (order_number) DO NOTHING;
        `
      })

      if (createError) {
        console.error('Error creating table:', createError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create table',
          details: createError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Table created successfully'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Table already exists',
      count: tableExists
    })

  } catch (error) {
    console.error('Error in setup-sales-orders:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}