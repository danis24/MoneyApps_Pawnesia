#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config(); // Also load .env for fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationFile {
  name: string;
  path: string;
  timestamp: string;
}

interface MigrationStatus {
  name: string;
  status: 'applied' | 'pending';
  applied_at?: string;
}

class SupabaseMigrator {
  private supabaseUrl: string;
  private supabaseKey: string;
  private migrationsDir: string;

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    this.migrationsDir = join(__dirname, '..', '..', 'supabase', 'migrations');

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      return false;
    }
  }

  async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({ sql: createTableSQL }),
      });

      if (!response.ok) {
        // Fallback to direct SQL execution if RPC not available
        console.log('⚠️  Creating migrations table via direct execution...');
        await this.executeDirectSQL(createTableSQL);
      }
    } catch (error) {
      console.log('⚠️  Creating migrations table via direct execution...');
      await this.executeDirectSQL(createTableSQL);
    }
  }

  async executeDirectSQL(sql: string): Promise<void> {
    try {
      // For direct SQL execution, we'll use the Supabase SQL API
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Prefer': 'params=single-object',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        throw new Error(`SQL execution failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ SQL execution failed:', error);
      throw error;
    }
  }

  async getAppliedMigrations(): Promise<MigrationStatus[]> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/schema_migrations?order=applied_at.asc`, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const migrations = await response.json();
      return migrations.map((m: any) => ({
        name: m.name,
        status: 'applied' as const,
        applied_at: m.applied_at,
      }));
    } catch (error) {
      console.error('❌ Failed to fetch applied migrations:', error);
      return [];
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

  async getMigrationStatus(): Promise<MigrationStatus[]> {
    const migrationFiles = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    return migrationFiles.map(file => {
      const applied = appliedMigrations.find(m => m.name === file.name);
      return {
        name: file.name,
        status: applied ? 'applied' : 'pending',
        applied_at: applied?.applied_at,
      };
    });
  }

  async applyMigration(migrationFile: MigrationFile): Promise<void> {
    console.log(`🔄 Applying migration: ${migrationFile.name}`);

    try {
      const sql = readFileSync(migrationFile.path, 'utf8');

      // Execute each statement separately
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        await this.executeDirectSQL(statement + ';');
      }

      // Record the migration
      const response = await fetch(`${this.supabaseUrl}/rest/v1/schema_migrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          name: migrationFile.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to record migration: ${response.statusText}`);
      }

      console.log(`✅ Migration applied successfully: ${migrationFile.name}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${migrationFile.name}`, error);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Running Supabase migrations...');

    // Check connection
    const connected = await this.checkConnection();
    if (!connected) {
      throw new Error('Cannot connect to Supabase. Please check your environment variables.');
    }

    // Create migrations table if it doesn't exist
    await this.createMigrationsTable();

    // Get migration status
    const migrations = await this.getMigrationStatus();
    const pendingMigrations = migrations.filter(m => m.status === 'pending');

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date!');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);

    // Apply pending migrations
    for (const migration of pendingMigrations) {
      const migrationFile = this.getMigrationFiles().find(f => f.name === migration.name);
      if (migrationFile) {
        await this.applyMigration(migrationFile);
      }
    }

    console.log('🎉 All migrations completed successfully!');
  }

  async rollbackMigration(steps: number = 1): Promise<void> {
    console.log('🔄 Rolling back migrations...');

    const appliedMigrations = await this.getAppliedMigrations();
    const toRollback = appliedMigrations.slice(-steps);

    if (toRollback.length === 0) {
      console.log('✅ No migrations to rollback!');
      return;
    }

    console.log(`📋 Rolling back ${toRollback.length} migration(s)`);

    // Note: This is a simplified rollback implementation
    // In production, you'd want to store down migration SQL
    for (const migration of toRollback.reverse()) {
      console.log(`⚠️  Rollback for ${migration.name} not implemented in this version`);
      console.log('   Manual rollback required');
    }
  }

  async resetDatabase(): Promise<void> {
    console.log('⚠️  RESETTING DATABASE - This will delete all data!');

    // Ask for confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Are you sure you want to reset the database? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Database reset cancelled');
      return;
    }

    try {
      console.log('🔄 Dropping all tables...');

      // Drop all tables (in reverse order of dependencies)
      const tables = [
        'schema_migrations',
        'transactions',
        'finance_categories',
        'products',
        'materials',
        'shops',
        'profiles'
      ];

      for (const table of tables) {
        const dropSQL = `DROP TABLE IF EXISTS ${table} CASCADE;`;
        await this.executeDirectSQL(dropSQL);
        console.log(`✅ Dropped table: ${table}`);
      }

      console.log('🔄 Resetting migrations...');

      // Reset migrations table
      await this.createMigrationsTable();

      console.log('🎉 Database reset successfully!');
      console.log('💡 Run "npm run db:migrate" to recreate tables');

    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  async showStatus(): Promise<void> {
    console.log('📊 Migration Status:\n');

    const migrations = await this.getMigrationStatus();

    if (migrations.length === 0) {
      console.log('No migrations found');
      return;
    }

    const maxLength = Math.max(...migrations.map(m => m.name.length));

    console.log('Status'.padEnd(10) + 'Migration'.padEnd(maxLength + 5) + 'Applied At');
    console.log('-'.repeat(50));

    for (const migration of migrations) {
      const status = migration.status === 'applied' ? '✅ Applied' : '⏳ Pending';
      const appliedAt = migration.applied_at ? new Date(migration.applied_at).toLocaleString() : '';
      console.log(
        status.padEnd(10) +
        migration.name.padEnd(maxLength + 5) +
        appliedAt
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
Supabase Migration Runner

Usage:
  npm run db:migrate                 # Run pending migrations
  npm run db:status                 # Show migration status
  npm run db:create <name>          # Create new migration file
  npm run db:rollback [steps]       # Rollback migrations (limited)
  npm run db:reset                  # Reset database (destructive!)

Examples:
  npm run db:migrate
  npm run db:create add_users_table
  npm run db:rollback 1
`);
    process.exit(0);
  }

  try {
    const migrator = new SupabaseMigrator();

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

      case 'rollback':
        const steps = parseInt(args[1]) || 1;
        await migrator.rollbackMigration(steps);
        break;

      case 'reset':
        await migrator.resetDatabase();
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

export { SupabaseMigrator };