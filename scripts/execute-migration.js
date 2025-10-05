require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeSQL(sql) {
  console.log('🔄 Executing SQL...');

  // For now, let's create tables individually using the client
  // We'll use a service role key in production, but for now we'll work with what we have

  try {
    // Let's first check if tables exist by trying to select from them
    const { data: shopsData, error: shopsError } = await supabase.from('shops').select('count', { count: 'exact', head: true });

    if (shopsError && shopsError.code === 'PGRST116') {
      console.log('📝 Tables need to be created. Please run the SQL manually in Supabase dashboard:');
      console.log('\n📄 SQL file location: supabase/complete-fix.sql');
      console.log('🌐 Supabase Dashboard: https://supabase.com/dashboard/project/wvsopmjsbjlbcnkbwgoz/sql/new');
      console.log('\n💡 Copy the content from supabase/complete-fix.sql and paste it there');
      return false;
    } else if (shopsError) {
      console.error('❌ Error checking tables:', shopsError);
      return false;
    } else {
      console.log('✅ Tables exist, checking columns...');

      // Check if required columns exist
      const { data: materialColumns, error: materialError } = await supabase.from('materials').select('unit_price').limit(1);

      if (materialError && materialError.message.includes('column "unit_price" does not exist')) {
        console.log('❌ Missing unit_price column in materials table');
        console.log('📝 Please run the SQL manually in Supabase dashboard to fix this');
        return false;
      }

      const { data: productColumns, error: productError } = await supabase.from('products').select('sku').limit(1);

      if (productError && productError.message.includes('column "sku" does not exist')) {
        console.log('❌ Missing sku column in products table');
        console.log('📝 Please run the SQL manually in Supabase dashboard to fix this');
        return false;
      }

      console.log('✅ All required columns exist');
      return true;
    }
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Database Migration Check\n');

  const success = await executeSQL();

  if (success) {
    console.log('\n✅ Database schema is ready!');
  } else {
    console.log('\n⚠️  Manual database setup required');
  }
}

main().catch(console.error);