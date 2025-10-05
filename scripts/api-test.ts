// API Testing Script for MoneyApps
// This script tests all API endpoints and reports errors

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'error';
  error?: string;
  data?: any;
  duration: number;
}

class APITester {
  private results: TestResult[] = [];
  private supabase: any;
  private user: any;

  constructor() {
    this.supabase = null;
    this.user = null;
  }

  async init() {
    try {
      console.log('🚀 Initializing API Test...');

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }

      // Initialize Supabase client
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('✅ Supabase client initialized');

      // Test basic connection
      const { data, error } = await this.supabase.from('shops').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
      }
      console.log('✅ Database connection successful');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.supabase = null;
    }
  }

  async testEndpoint(endpoint: string, method: string = 'GET', data?: any): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n📡 Testing ${method} ${endpoint}...`);

    try {
      let result: any;

      switch (method) {
        case 'GET':
          result = await this.supabase.from(endpoint).select('*');
          break;
        case 'POST':
          result = await this.supabase.from(endpoint).insert(data).select();
          break;
        case 'PUT':
          result = await this.supabase.from(endpoint).update(data).select();
          break;
        case 'DELETE':
          result = await this.supabase.from(endpoint).delete().select();
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        endpoint,
        method,
        status: result.error ? 'error' : 'success',
        error: result.error?.message,
        data: result.data,
        duration
      };

      if (result.error) {
        console.log(`❌ ${method} ${endpoint} failed: ${result.error.message}`);
        console.log(`   Error details:`, result.error);
      } else {
        console.log(`✅ ${method} ${endpoint} succeeded (${duration}ms)`);
        console.log(`   Records returned: ${Array.isArray(result.data) ? result.data.length : 1}`);
      }

      this.results.push(testResult);
      return testResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        endpoint,
        method,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };

      console.log(`❌ ${method} ${endpoint} failed: ${testResult.error}`);
      this.results.push(testResult);
      return testResult;
    }
  }

  async testBasicTables() {
    console.log('\n🔍 Testing basic table operations...');

    // Test basic table access
    await this.testEndpoint('profiles', 'GET');
    await this.testEndpoint('shops', 'GET');
    await this.testEndpoint('products', 'GET');
    await this.testEndpoint('materials', 'GET');
    await this.testEndpoint('finance_categories', 'GET');
    await this.testEndpoint('transactions', 'GET');
    await this.testEndpoint('categories', 'GET');
    await this.testEndpoint('sales', 'GET');
    await this.testEndpoint('sale_items', 'GET');
    await this.testEndpoint('stock_history', 'GET');
    await this.testEndpoint('employees', 'GET');
  }

  async testInsertOperations() {
    if (!this.user) {
      console.log('\n⚠️  Skipping insert tests - no authenticated user');
      return;
    }

    console.log('\n📝 Testing insert operations...');

    // Test creating a shop
    const shopData = {
      name: 'Test Shop API',
      description: 'Created by API test',
      owner_id: this.user.id
    };
    await this.testEndpoint('shops', 'POST', shopData);

    // Test creating a product
    const productData = {
      name: 'Test Product API',
      description: 'Created by API test',
      price: 99.99,
      stock_quantity: 10,
      shop_id: this.results.find(r => r.endpoint === 'shops' && r.method === 'POST' && r.status === 'success')?.data?.[0]?.id
    };
    if (productData.shop_id) {
      await this.testEndpoint('products', 'POST', productData);
    }

    // Test creating a material
    const materialData = {
      name: 'Test Material API',
      description: 'Created by API test',
      unit_cost: 25.50,
      quantity_on_hand: 50,
      current_stock: 50,
      min_stock: 10,
      unit: 'pcs',
      sku: 'TEST-MATERIAL-API',
      shop_id: productData.shop_id
    };
    if (materialData.shop_id) {
      await this.testEndpoint('materials', 'POST', materialData);
    }

    // Test creating a finance category
    const categoryData = {
      name: 'Test Category API',
      type: 'expense',
      description: 'Created by API test',
      shop_id: productData.shop_id,
      user_id: this.user.id
    };
    if (categoryData.shop_id) {
      await this.testEndpoint('finance_categories', 'POST', categoryData);
    }

    // Test creating a transaction
    const transactionData = {
      amount: 100.00,
      description: 'Test transaction API',
      type: 'expense',
      category_id: this.results.find(r => r.endpoint === 'finance_categories' && r.method === 'POST' && r.status === 'success')?.data?.[0]?.id,
      shop_id: productData.shop_id
    };
    if (transactionData.category_id && transactionData.shop_id) {
      await this.testEndpoint('transactions', 'POST', transactionData);
    }
  }

  async testSpecificQueries() {
    console.log('\n🔎 Testing specific queries that might fail...');

    // Test materials with stock queries
    await this.testEndpoint('materials', 'GET').then(async (result) => {
      if (result.status === 'success' && result.data && result.data.length > 0) {
        // Test selecting specific columns that might be missing
        try {
          const specificResult = await this.supabase
            .from('materials')
            .select('id, name, current_stock, min_stock, unit_price, unit, sku');

          if (specificResult.error) {
            console.log(`❌ Materials column query failed: ${specificResult.error.message}`);
            this.results.push({
              endpoint: 'materials (specific columns)',
              method: 'GET',
              status: 'error',
              error: specificResult.error.message,
              duration: 0
            });
          } else {
            console.log(`✅ Materials column query succeeded`);
          }
        } catch (error) {
          console.log(`❌ Materials column query failed: ${error}`);
        }
      }
    });

    // Test products with specific queries
    await this.testEndpoint('products', 'GET').then(async (result) => {
      if (result.status === 'success' && result.data && result.data.length > 0) {
        try {
          const specificResult = await this.supabase
            .from('products')
            .select('id, name, price, stock_quantity, sku');

          if (specificResult.error) {
            console.log(`❌ Products column query failed: ${specificResult.error.message}`);
            this.results.push({
              endpoint: 'products (specific columns)',
              method: 'GET',
              status: 'error',
              error: specificResult.error.message,
              duration: 0
            });
          } else {
            console.log(`✅ Products column query succeeded`);
          }
        } catch (error) {
          console.log(`❌ Products column query failed: ${error}`);
        }
      }
    });
  }

  generateReport() {
    console.log('\n📊 API Test Report');
    console.log('='.repeat(50));

    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'success').length;
    const failed = total - passed;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`  ${r.method} ${r.endpoint}: ${r.error}`);
        });
    }

    console.log('\n⏱️  Performance Summary:');
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`Average response time: ${avgDuration.toFixed(2)}ms`);

    // Save detailed results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        successRate: ((passed / total) * 100).toFixed(1),
        averageDuration: avgDuration.toFixed(2)
      },
      results: this.results
    };

    require('fs').writeFileSync(
      'api-test-report.json',
      JSON.stringify(reportData, null, 2)
    );
    console.log('\n📄 Detailed report saved to: api-test-report.json');
  }

  async run() {
    await this.init();

    if (!this.supabase) {
      console.log('❌ Cannot run tests - Supabase client not initialized');
      return;
    }

    await this.testBasicTables();
    await this.testSpecificQueries();
    await this.testInsertOperations();

    this.generateReport();
  }
}

// Run the tests
const tester = new APITester();
tester.run().catch(console.error);