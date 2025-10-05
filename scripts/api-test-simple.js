require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAPI() {
  console.log('🚀 Starting API Tests...\n');

  const results = [];

  // Test basic table connections
  const tables = ['profiles', 'shops', 'products', 'materials', 'finance_categories', 'transactions', 'categories', 'sales', 'sale_items', 'stock_history', 'employees'];

  for (const table of tables) {
    console.log(`📡 Testing ${table}...`);
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      const duration = Date.now() - startTime;

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        results.push({ table, status: 'error', error: error.message, duration });
      } else {
        console.log(`✅ ${table}: ${data.count || 0} records (${duration}ms)`);
        results.push({ table, status: 'success', count: data.count || 0, duration });
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
      results.push({ table, status: 'error', error: error.message, duration: 0 });
    }
  }

  // Test specific columns that were problematic
  console.log('\n🔍 Testing specific columns...');

  // Test materials columns
  try {
    const { data, error } = await supabase.from('materials').select('id, name, current_stock, min_stock, unit_price, unit, sku').limit(1);
    if (error) {
      console.log(`❌ Materials columns: ${error.message}`);
      results.push({ test: 'materials_columns', status: 'error', error: error.message });
    } else {
      console.log('✅ Materials columns: All required columns exist');
      results.push({ test: 'materials_columns', status: 'success' });
    }
  } catch (error) {
    console.log(`❌ Materials columns: ${error.message}`);
    results.push({ test: 'materials_columns', status: 'error', error: error.message });
  }

  // Test products columns
  try {
    const { data, error } = await supabase.from('products').select('id, name, price, stock_quantity, sku').limit(1);
    if (error) {
      console.log(`❌ Products columns: ${error.message}`);
      results.push({ test: 'products_columns', status: 'error', error: error.message });
    } else {
      console.log('✅ Products columns: All required columns exist');
      results.push({ test: 'products_columns', status: 'success' });
    }
  } catch (error) {
    console.log(`❌ Products columns: ${error.message}`);
    results.push({ test: 'products_columns', status: 'error', error: error.message });
  }

  // Generate report
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));

  const total = results.length;
  const passed = results.filter(r => r.status === 'success').length;
  const failed = total - passed;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        if (r.table) {
          console.log(`  ${r.table}: ${r.error}`);
        } else {
          console.log(`  ${r.test}: ${r.error}`);
        }
      });
  }

  // Save detailed results
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      successRate: ((passed / total) * 100).toFixed(1)
    },
    results
  };

  const fs = require('fs');
  fs.writeFileSync('api-test-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Detailed report saved to: api-test-report.json');
}

testAPI().catch(console.error);