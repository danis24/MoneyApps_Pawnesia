# MoneyApps Database Migrations

## Migration Files

This directory contains all the database migrations for MoneyApps, organized in a sequential order:

### 1. `001_initial_schema.sql`
- Creates all database tables with proper structure
- Sets up relationships between tables
- Includes all necessary columns with correct data types

### 2. `002_rls_policies.sql`
- Enables Row Level Security (RLS) on all tables
- Creates security policies for user-based access control
- Implements proper authentication integration with Clerk

### 3. `003_indexes.sql`
- Creates database indexes for better performance
- Optimizes query performance on frequently accessed columns
- Includes foreign key indexes and user_id indexes

### 4. `004_triggers.sql`
- Creates updated_at triggers for automatic timestamp updates
- Implements database-level data consistency

### 5. `005_sample_data.sql`
- Inserts sample data for testing and demonstration
- Creates sample categories, products, and materials
- Includes demo shop and finance categories

## Execution Order

Migrations should be executed in numerical order:
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_indexes.sql`
4. `004_triggers.sql`
5. `005_sample_data.sql`

## Database Schema Overview

### Core Tables
- `profiles` - User profile information
- `shops` - Business/shop information
- `categories` - Product categories

### Business Tables
- `products` - Finished products for sale
- `materials` - Raw materials/inventory
- `finance_categories` - Income and expense categories
- `transactions` - Financial transactions
- `sales` - Sales records
- `sale_items` - Individual sale items
- `stock_history` - Inventory tracking
- `employees` - Employee management

## Security Features

- Row Level Security (RLS) enabled on all tables
- User-based access control via Clerk JWT
- Proper foreign key constraints
- Data isolation between users

## Notes

- All tables use UUID for primary keys
- Automatic timestamps for created_at and updated_at
- Proper relationships and constraints
- Sample data uses demo user ID: `user_33Xhnqa6JLKOAjnCyLo2KTwEiUq`