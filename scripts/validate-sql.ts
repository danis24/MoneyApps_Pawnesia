#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config();

class SQLValidator {
  private sqlPath: string;

  constructor() {
    this.sqlPath = join(process.cwd(), 'supabase', 'combined-migrations.sql');
  }

  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const sql = readFileSync(this.sqlPath, 'utf8');

      // Check for common syntax issues
      const lines = sql.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // Check for ADD CONSTRAINT IF NOT EXISTS (invalid syntax)
        if (line.includes('ADD CONSTRAINT IF NOT EXISTS')) {
          errors.push(`Line ${lineNumber}: Invalid syntax 'ADD CONSTRAINT IF NOT EXISTS'`);
        }

        // Check for CREATE TRIGGER IF NOT EXISTS (invalid syntax)
        if (line.includes('CREATE TRIGGER IF NOT EXISTS')) {
          errors.push(`Line ${lineNumber}: Invalid syntax 'CREATE TRIGGER IF NOT EXISTS'`);
        }

        // Check for unterminated string literals
        const singleQuotes = (line.match(/'/g) || []).length;
        if (singleQuotes % 2 !== 0) {
          warnings.push(`Line ${lineNumber}: Odd number of single quotes - possible unterminated string`);
        }

        // Check for potential issues with dollar quotes
        if (line.includes('$$') && line.includes('DO $$')) {
          // Check if DO block is properly closed
          const doBlockStart = line.indexOf('DO $$');
          if (doBlockStart !== -1) {
            const remainingContent = sql.substring(sql.indexOf(line) + doBlockStart);
            if (!remainingContent.includes('END;$$')) {
              errors.push(`Line ${lineNumber}: DO block not properly closed with 'END;$$'`);
            }
          }
        }

        // Check for missing semicolons (basic check)
        if (line.trim() && !line.trim().endsWith(';') && !line.trim().startsWith('--') && !line.trim().startsWith('/*') && line.trim() !== '') {
          const isStatement = /^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|SELECT)/i.test(line.trim());
          const isBlockStart = /^(DO|BEGIN|CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|TRIGGER|PROCEDURE))/i.test(line.trim());
          const isControlFlow = /^(IF|FOR|WHILE|LOOP)/i.test(line.trim());
          const isEndBlock = /^(END|ELSE|ELSIF)/i.test(line.trim());

          if (isStatement && !isBlockStart && !isEndBlock && !isControlFlow) {
            warnings.push(`Line ${lineNumber}: Statement might be missing semicolon`);
          }
        }
      });

      // Check for balanced parentheses
      const openParens = (sql.match(/\(/g) || []).length;
      const closeParens = (sql.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push(`Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
      }

      // Check for BEGIN without COMMIT/ROLLBACK
      const beginCount = (sql.match(/\bBEGIN\b/g) || []).length;
      const commitCount = (sql.match(/\bCOMMIT\b/g) || []).length;
      const rollbackCount = (sql.match(/\bROLLBACK\b/g) || []).length;

      if (beginCount > commitCount + rollbackCount) {
        warnings.push(`Possible missing COMMIT or ROLLBACK statements`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Could not read SQL file: ${error}`],
        warnings: []
      };
    }
  }

  showReport(): void {
    console.log('🔍 SQL Validation Report\n');

    const report = this.validate();

    if (report.valid) {
      console.log('✅ SQL syntax appears to be valid!');
    } else {
      console.log('❌ SQL syntax errors found:');
      report.errors.forEach(error => {
        console.log(`   ${error}`);
      });
    }

    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.warnings.forEach(warning => {
        console.log(`   ${warning}`);
      });
    }

    if (report.errors.length === 0) {
      console.log('\n🎉 SQL file is ready for execution!');
    } else {
      console.log('\n💡 Please fix the errors before executing the SQL.');
    }
  }
}

// CLI Handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
SQL Validator

Validates the generated SQL file for common syntax issues.

Usage:
  npm run db:validate                 # Validate combined SQL file

Examples:
  npm run db:validate
`);
    process.exit(0);
  }

  try {
    const validator = new SQLValidator();

    switch (command) {
      case 'validate':
        validator.showReport();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SQLValidator };