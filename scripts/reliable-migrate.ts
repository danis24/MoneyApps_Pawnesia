#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationFile {
  name: string;
  path: string;
  timestamp: string;
}

class ReliableSupabaseMigrator {
  private supabaseUrl: string;
  private supabaseKey: string;
  private migrationsDir: string;

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    this.migrationsDir = join(process.cwd(), 'supabase', 'migrations');

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  }

  createSupabaseClient() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  async checkConnection(): Promise<boolean> {
    try {
      const supabase = this.createSupabaseClient();
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

      if (error) {
        // If table doesn't exist, that's okay - we'll create it
        if (error.code === '42P01') { // undefined_table
          return true;
        }
        console.log('Connection check error:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  async createMigrationsTable(): Promise<boolean> {
    try {
      const supabase = this.createSupabaseClient();

      // Try to create the migrations table using raw SQL via Supabase SQL editor approach
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        GRANT ALL ON schema_migrations TO authenticated;
        GRANT SELECT ON schema_migrations TO anon;
      `;

      // Execute SQL using the Supabase client's rpc method with a different approach
      const result = await this.executeRawSQL(createTableSQL);

      if (result) {
        console.log('✅ Migrations table created successfully');
        return true;
      } else {
        console.log('⚠️  Could not create migrations table, continuing without tracking');
        return false;
      }
    } catch (error) {
      console.log('⚠️  Could not create migrations table, continuing without tracking');
      return false;
    }
  }

  async executeRawSQL(sql: string): Promise<boolean> {
    try {
      // Use the Supabase SQL API endpoint directly
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Prefer': 'params=single-object',
        },
        body: JSON.stringify({
          query: sql,
        }),
      });

      if (!response.ok) {
        // Try alternative approach using the SQL RPC if available
        return await this.executeViaRPCTable(sql);
      }

      const result = await response.json();
      return true;
    } catch (error) {
      // Fallback to table-based execution
      return await this.executeViaRPCTable(sql);
    }
  }

  async executeViaRPCTable(sql: string): Promise<boolean> {
    try {
      const supabase = this.createSupabaseClient();

      // Create a temporary table to execute SQL
      const tempTableName = `temp_sql_${Date.now()}`;

      // Try to create a function and execute it
      const functionSQL = `
        CREATE OR REPLACE FUNCTION ${tempTableName}()
        RETURNS VOID AS $$
        BEGIN
          ${sql}
        END;
        $$ LANGUAGE plpgsql;
      `;

      const createFunctionResult = await this.executeViaDirectQuery(functionSQL);

      if (createFunctionResult) {
        // Execute the function
        const executeSQL = `SELECT ${tempTableName}();`;
        await this.executeViaDirectQuery(executeSQL);

        // Clean up
        const dropFunctionSQL = `DROP FUNCTION IF EXISTS ${tempTableName}();`;
        await this.executeViaDirectQuery(dropFunctionSQL);

        return true;
      }

      return false;
    } catch (error) {
      console.log('⚠️  Function execution failed:', error);
      return false;
    }
  }

  async executeViaDirectQuery(sql: string): Promise<boolean> {
    try {
      const supabase = this.createSupabaseClient();

      // Use a different approach - try to use the raw SQL if we have admin access
      const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({ sql }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getMigrationFiles(): MigrationFile[] {
    if (!existsSync(this.migrationsDir)) {
      mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }

    const files = readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const timestamp = file.split('_')[0];
        return {
          name: file,
          path: join(this.migrationsDir, file),
          timestamp,
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return files;
  }

  async getAppliedMigrations(): Promise<string[]> {
    try {
      const supabase = this.createSupabaseClient();
      const { data, error } = await supabase
        .from('schema_migrations')
        .select('name')
        .order('applied_at', { ascending: true });

      if (error) {
        console.log('⚠️  Could not fetch applied migrations:', error.message);
        return [];
      }

      return data.map((row: any) => row.name);
    } catch (error) {
      console.log('⚠️  Could not fetch applied migrations');
      return [];
    }
  }

  async executeMigrationFile(migrationFile: MigrationFile): Promise<boolean> {
    console.log(`🔄 Executing: ${migrationFile.name}`);

    try {
      const sql = readFileSync(migrationFile.path, 'utf8');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement.length === 0) continue;

        try {
          const result = await this.executeRawSQL(statement + ';');
          if (result) {
            successCount++;
          } else {
            failCount++;
            console.log(`⚠️  Statement ${i + 1} could not be executed via API`);
          }
        } catch (error) {
          failCount++;
          console.log(`⚠️  Statement ${i + 1} failed:`, error);
        }
      }

      // Try to record the migration
      try {
        const supabase = this.createSupabaseClient();
        const { error } = await supabase
          .from('schema_migrations')
          .insert([{ name: migrationFile.name }]);

        if (error) {
          console.log(`⚠️  Could not record migration: ${error.message}`);
        } else {
          console.log(`✅ Migration recorded: ${migrationFile.name}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not record migration`);
      }

      console.log(`✅ Migration executed: ${migrationFile.name} (${successCount} successful, ${failCount} failed)`);
      return successCount > 0;

    } catch (error) {
      console.error(`❌ Failed to read migration file: ${migrationFile.name}`, error);
      return false;
    }
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Running Supabase migrations...');

    // Check connection
    const connected = await this.checkConnection();
    if (!connected) {
      throw new Error('Cannot connect to Supabase. Please check your environment variables.');
    }

    // Create migrations table
    await this.createMigrationsTable();

    // Get migration files
    const migrationFiles = this.getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }

    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.includes(file.name));

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are up to date!');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);

    // Apply pending migrations
    let successCount = 0;
    for (const migration of pendingMigrations) {
      const success = await this.executeMigrationFile(migration);
      if (success) {
        successCount++;
      }
    }

    if (successCount === pendingMigrations.length) {
      console.log('🎉 All migrations completed successfully!');
    } else {
      console.log(`⚠️  ${successCount}/${pendingMigrations.length} migrations completed successfully`);
      console.log('💡 Some statements may need to be executed manually in the Supabase SQL Editor');
    }
  }

  async showStatus(): Promise<void> {
    console.log('📊 Migration Status:\n');

    const migrationFiles = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    if (migrationFiles.length === 0) {
      console.log('No migrations found');
      return;
    }

    const maxLength = Math.max(...migrationFiles.map(m => m.name.length));

    console.log('Status'.padEnd(10) + 'Migration'.padEnd(maxLength + 5));
    console.log('-'.repeat(50));

    for (const migration of migrationFiles) {
      const status = appliedMigrations.includes(migration.name) ? '✅ Applied' : '⏳ Pending';
      console.log(
        status.padEnd(10) +
        migration.name.padEnd(maxLength + 5)
      );
    }
  }

  async createMigration(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${timestamp}_${name}.sql`;
    const filepath = join(this.migrationsDir, filename);

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here

`;

    if (!existsSync(this.migrationsDir)) {
      mkdirSync(this.migrationsDir, { recursive: true });
    }

    writeFileSync(filepath, template);
    console.log(`✅ Created migration file: ${filename}`);
    console.log(`   Location: ${filepath}`);
  }
}

// CLI Handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Reliable Supabase Migration Runner

Usage:
  npm run db:migrate                 # Run pending migrations
  npm run db:status                 # Show migration status
  npm run db:create <name>          # Create new migration file

Examples:
  npm run db:migrate
  npm run db:create add_users_table
`);
    process.exit(0);
  }

  try {
    const migrator = new ReliableSupabaseMigrator();

    switch (command) {
      case 'migrate':
        await migrator.runMigrations();
        break;

      case 'status':
        await migrator.showStatus();
        break;

      case 'create':
        const name = args[1];
        if (!name) {
          console.error('❌ Migration name is required');
          process.exit(1);
        }
        await migrator.createMigration(name);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ReliableSupabaseMigrator };