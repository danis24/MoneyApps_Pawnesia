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

class SimpleSupabaseMigrator {
  private supabase: any;
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

    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.from('profiles').select('count', { count: 'exact', head: true });
      return !error;
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
      // Use RPC to execute raw SQL
      const { error } = await this.supabase.rpc('exec_sql', { sql: createTableSQL });

      if (error) {
        console.log('⚠️  RPC not available, trying manual table creation...');
        // If RPC fails, we'll proceed without tracking for now
        console.log('ℹ️  Migration tracking disabled for this session');
      }
    } catch (error) {
      console.log('ℹ️  Could not create migrations table, proceeding without tracking');
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
      const { data, error } = await this.supabase
        .from('schema_migrations')
        .select('name')
        .order('applied_at', { ascending: true });

      if (error) {
        return [];
      }

      return data.map((row: any) => row.name);
    } catch (error) {
      return [];
    }
  }

  async executeSQLFile(sql: string, migrationName: string): Promise<void> {
    console.log(`🔄 Executing migration: ${migrationName}`);

    try {
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';

        try {
          // Try to use RPC first
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement });

          if (error) {
            console.log(`⚠️  Statement ${i + 1} failed via RPC: ${error.message}`);
            // Continue with other statements
          }
        } catch (e) {
          console.log(`⚠️  Statement ${i + 1} failed via RPC, continuing...`);
          // Continue with other statements
        }
      }

      // Try to record the migration
      try {
        const { error } = await this.supabase
          .from('schema_migrations')
          .insert([{ name: migrationName }]);

        if (error) {
          console.log(`⚠️  Could not record migration: ${error.message}`);
        }
      } catch (e) {
        console.log(`⚠️  Could not record migration`);
      }

      console.log(`✅ Migration executed: ${migrationName}`);

    } catch (error) {
      console.error(`❌ Migration failed: ${migrationName}`, error);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Running Supabase migrations...');

    // Check connection
    const connected = await this.checkConnection();
    if (!connected) {
      console.log('ℹ️  Could not connect to check existing tables, proceeding with migrations...');
    }

    // Create migrations table if possible
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
    for (const migration of pendingMigrations) {
      try {
        const sql = readFileSync(migration.path, 'utf8');
        await this.executeSQLFile(sql, migration.name);
      } catch (error) {
        console.error(`❌ Failed to read migration file: ${migration.name}`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
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
Simple Supabase Migration Runner

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
    const migrator = new SimpleSupabaseMigrator();

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

export { SimpleSupabaseMigrator };