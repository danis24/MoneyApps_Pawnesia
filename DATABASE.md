# Database Migration Guide

This guide explains how to manage database migrations for your MoneyApps project using Supabase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Migration Commands](#migration-commands)
- [Migration Files](#migration-files)
- [Database Schema](#database-schema)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before running migrations, ensure you have:

1. **Environment Variables Set**:
   ```bash
   # Copy .env.example to .env.local
   cp .env.example .env.local

   # Edit .env.local with your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Supabase Project Created**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project
   - Copy your project URL and anon key

3. **Dependencies Installed**:
   ```bash
   npm install
   ```

## Migration Commands

### Run Migrations
```bash
# Run all pending migrations
npm run db:migrate

# Example output:
# 🚀 Running Supabase migrations...
# 📋 Found 1 pending migration(s)
# 🔄 Applying migration: 001_moneyapps_tables_with_rls.sql
# ✅ Migration applied successfully: 001_moneyapps_tables_with_rls.sql
# 🎉 All migrations completed successfully!
```

### Check Migration Status
```bash
# Show which migrations have been applied
npm run db:status

# Example output:
# 📊 Migration Status:
#
# Status    Migration                           Applied At
# --------------------------------------------------
# ✅ Applied 001_moneyapps_tables_with_rls.sql  2024-01-15 10:30:00
# ⏳ Pending 002_add_indexes.sql
```

### Create New Migration
```bash
# Create a new migration file
npm run db:create <migration_name>

# Examples:
npm run db:create add_users_table
npm run db:create add_products_table
npm run db:create update_shops_schema

# This creates a file like: 2024-01-15T10-30-00_add_users_table.sql
```

### Rollback Migrations
```bash
# Rollback last migration
npm run db:rollback

# Rollback specific number of migrations
npm run db:rollback 2
```

## Migration Files

### File Structure
```
supabase/migrations/
├── 001_moneyapps_tables_with_rls.sql
├── 002_add_indexes.sql
└── 003_update_user_profiles.sql
```

### Naming Convention
Migration files should follow this pattern:
```
[timestamp]_[description].sql
```

Examples:
- `001_create_tables.sql`
- `002_add_indexes.sql`
- `003_update_user_schema.sql`

### Migration File Template
```sql
-- Migration: Add user preferences table
-- Created: 2024-01-15T10:30:00

-- Add your migration SQL here
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL,
    theme TEXT DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Add index for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## Database Schema

### Core Tables

#### `profiles`
User profile information linked to Clerk users.
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL, -- Clerk user ID
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `shops`
Shop information owned by users.
```sql
CREATE TABLE shops (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    owner_id TEXT NOT NULL, -- Clerk user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `products`
Products for each shop.
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `materials`
Materials for each shop.
```sql
CREATE TABLE materials (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    unit_cost DECIMAL(10,2),
    quantity_on_hand INTEGER DEFAULT 0,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `finance_categories`
Income and expense categories for shops.
```sql
CREATE TABLE finance_categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `transactions`
Financial transactions for shops.
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES finance_categories(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

All tables use Row Level Security to ensure users can only access their own data.

### RLS Policy Pattern

```sql
-- Enable RLS on table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data" ON your_table
    FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data" ON your_table
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON your_table
    FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own data" ON your_table
    FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);
```

### Related Table RLS

For tables that reference other tables (like products belonging to shops):

```sql
-- Users can view products from their shops
CREATE POLICY "Users can view products from their shops" ON products
    FOR SELECT USING (
        auth.jwt() ->> 'sub' IN (
            SELECT owner_id FROM shops WHERE id = products.shop_id
        )
    );

-- Users can create products in their shops
CREATE POLICY "Users can create products in their shops" ON products
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'sub' IN (
            SELECT owner_id FROM shops WHERE id = products.shop_id
        )
    );
```

## Common Tasks

### Adding a New Table

1. Create migration file:
   ```bash
   npm run db:create add_new_table
   ```

2. Add table definition with RLS:
   ```sql
   CREATE TABLE new_table (
       id UUID PRIMARY KEY,
       name TEXT NOT NULL,
       user_id TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view own data" ON new_table
       FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

   CREATE POLICY "Users can insert own data" ON new_table
       FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);
   ```

3. Run migration:
   ```bash
   npm run db:migrate
   ```

### Adding a New Column

1. Create migration file:
   ```bash
   npm run db:create add_phone_to_profiles
   ```

2. Add column:
   ```sql
   ALTER TABLE profiles ADD COLUMN phone TEXT;

   -- Add index if needed
   CREATE INDEX idx_profiles_phone ON profiles(phone);
   ```

3. Run migration:
   ```bash
   npm run db:migrate
   ```

### Creating Indexes

```sql
-- Single column index
CREATE INDEX idx_shops_owner_id ON shops(owner_id);

-- Composite index
CREATE INDEX idx_transactions_shop_date ON transactions(shop_id, transaction_date);

-- Unique index
CREATE UNIQUE INDEX idx_profiles_user_id ON profiles(user_id);
```

### Adding Foreign Key Constraints

```sql
-- Add foreign key constraint
ALTER TABLE products
ADD CONSTRAINT fk_products_shop
FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
```

## Troubleshooting

### Migration Failed

1. **Check Connection**:
   ```bash
   # Verify environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Check Migration Status**:
   ```bash
   npm run db:status
   ```

3. **Manually Fix Issues**:
   - Go to Supabase dashboard
   - Check SQL Editor for errors
   - Fix the migration file
   - Rerun migration

### Connection Issues

1. **Verify Credentials**:
   - Check Supabase dashboard for correct URL and keys
   - Ensure `.env.local` file exists and is properly formatted

2. **Network Issues**:
   - Check internet connection
   - Verify Supabase project is active

### RLS Issues

1. **Permission Denied Errors**:
   - Ensure RLS policies are correctly set up
   - Check that policies use `auth.jwt() ->> 'sub'` for Clerk user IDs
   - Verify user is authenticated

2. **Policy Conflicts**:
   - Check for conflicting policies
   - Ensure policies don't override each other

### Rollback Issues

1. **Manual Rollback**:
   ```sql
   -- Delete migration record
   DELETE FROM schema_migrations WHERE name = 'your_migration.sql';

   -- Manually revert changes
   DROP TABLE IF EXISTS your_table;
   ```

2. **Force Reset**:
   ```bash
   # This will reset your database - USE WITH CAUTION
   npm run db:reset
   ```

## Best Practices

1. **Always Test Locally**: Test migrations in a development environment first
2. **Use Descriptive Names**: Make migration names clear and specific
3. **Keep Migrations Atomic**: Each migration should do one thing well
4. **Backup Important Data**: Always backup before running destructive operations
5. **Use RLS**: Always implement Row Level Security for user data
6. **Add Indexes**: Add appropriate indexes for better performance
7. **Document Changes**: Add comments explaining complex changes

## API Endpoints for Testing

### Database Connection Test
```bash
curl http://localhost:3000/api/db-test
```

### Shops API (requires authentication)
```bash
# Get shops
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/shops

# Create shop
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"name": "My Shop", "description": "Test shop"}' \
     http://localhost:3000/api/shops
```

## Next Steps

1. **Run Initial Migration**:
   ```bash
   npm run db:migrate
   ```

2. **Set Up Clerk Integration**:
   - Configure third-party auth in Supabase dashboard
   - Follow the setup guide in `SUPABASE_CLERK_SETUP.md`

3. **Test Integration**:
   - Use the provided API endpoints
   - Test with the example components

4. **Start Building**:
   - Create your application features
   - Add new migrations as needed
   - Follow the RLS patterns for security