-- Add channel column to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'offline';

-- Update existing records to have a default channel
UPDATE shops SET channel = 'offline' WHERE channel IS NULL;