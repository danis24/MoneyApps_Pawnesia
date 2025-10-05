-- Add is_active column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE employees SET is_active = true WHERE is_active IS NULL;