-- Add is_active column to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE materials SET is_active = true WHERE is_active IS NULL;