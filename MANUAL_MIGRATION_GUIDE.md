# Manual Database Migration Guide

## ⚠️ Important: Manual Execution Required

Due to Supabase API limitations, migrations need to be executed manually in the Supabase SQL Editor.

## Quick Setup (5 Minutes)

### Step 1: Generate Combined SQL
```bash
npm run db:generate
```

This creates a combined SQL file at: `supabase/combined-migrations.sql`

### Step 2: Execute in Supabase Dashboard

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to "SQL Editor"** in the left sidebar
4. **Click "New query"**
5. **Copy the entire content** from `supabase/combined-migrations.sql`
6. **Paste into the SQL editor**
7. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)

### Step 3: Verify Success
```bash
npm run db:status
```

## Available Commands

```bash
# Generate combined SQL file for manual execution
npm run db:generate

# Show available migration files
npm run db:status

# Create new migration file
npm run db:create <migration_name>

# Attempt automatic migration (may have limitations)
npm run db:migrate
```

## What's Included in the Migration

The combined SQL includes:

### Core Tables
- **schema_migrations** - Migration tracking
- **profiles** - User profile information
- **shops** - Business/shop information
- **products** - Product catalog
- **materials** - Materials/inventory
- **finance_categories** - Income/expense categories
- **transactions** - Financial records

### Security Features
- **Row Level Security (RLS)** on all tables
- **Policies** for user data isolation
- **JWT-based authentication** with Clerk integration

### Performance & Integrity
- **Indexes** for query optimization
- **Constraints** for data validation
- **Triggers** for automatic timestamps
- **Cascading deletes** for data consistency

## Troubleshooting

### Common Issues

1. **SQL Execution Errors**
   - Check for syntax errors in the SQL
   - Ensure you have admin privileges
   - Try running smaller sections at a time

2. **Permission Errors**
   - Make sure you're using the project owner account
   - Check that your Supabase project is active

3. **Table Already Exists**
   - The SQL uses `IF NOT EXISTS` to handle this
   - Errors can be safely ignored

### Verification Steps

After running the SQL, verify:

1. **Tables Created**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE';
   ```

2. **RLS Enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public';
   ```

3. **Migration Tracking**:
   ```sql
   SELECT * FROM schema_migrations ORDER BY applied_at;
   ```

## Alternative: Individual Migration Files

If the combined SQL fails, you can run individual files:

1. Go to SQL Editor
2. Copy content from individual files in `supabase/migrations/`
3. Run them in order:
   - `001_example_tables_with_rls.sql`
   - `001_moneyapps_tables_with_rls.sql`
   - `001a_helper_functions.sql`
   - `002_add_indexes.sql`
   - `002_add_stock_functions.sql`
   - `002_moneyapps_business_management.sql`
   - `003_add_constraints_and_triggers.sql`
   - `003_default_finance_categories.sql`
   - `004_profiles_trigger.sql`

## Creating New Migrations

```bash
# Create new migration
npm run db:create add_new_feature

# This creates: supabase/migrations/2024-01-15T10-30-00_add_new_feature.sql

# Edit the file, then regenerate combined SQL
npm run db:generate

# Execute in Supabase dashboard
```

## Next Steps After Migration

1. **Test Database Connection**:
   ```bash
   curl http://localhost:3000/api/db-test
   ```

2. **Set Up Clerk Integration**:
   - Follow `SUPABASE_CLERK_SETUP.md`
   - Configure third-party auth in Supabase

3. **Start Development**:
   ```bash
   npm run dev
   ```

## Why Manual Execution?

The automatic migration approach has limitations because:
- Supabase doesn't provide a public SQL execution API
- RPC functions require admin setup
- Direct SQL execution has security restrictions

Manual execution via SQL Editor ensures:
- ✅ Full SQL capabilities available
- ✅ Proper error handling
- ✅ Transaction support
- ✅ Admin privileges
- ✅ Visual feedback

## Success Checklist

- [ ] Run `npm run db:generate`
- [ ] Execute SQL in Supabase dashboard
- [ ] Verify tables are created
- [ ] Check RLS policies are enabled
- [ ] Test with `npm run db:status`
- [ ] Set up Clerk integration
- [ ] Test API endpoints

## Support

If you encounter issues:
1. Check Supabase project status
2. Verify your SQL Editor permissions
3. Try running individual migration files
4. Check Supabase documentation for any changes