-- Add type column to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Bahan' CHECK (type IN ('Jasa', 'Bahan'));

-- Update existing records to have default type
UPDATE materials SET type = 'Bahan' WHERE type IS NULL;