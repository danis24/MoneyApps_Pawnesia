-- Fix consistency: rename owner_id to user_id in shops table
ALTER TABLE shops RENAME COLUMN owner_id TO user_id;

-- Update RLS policies to use user_id instead of owner_id
DROP POLICY IF EXISTS "Users can view own shops" ON shops;
DROP POLICY IF EXISTS "Users can insert own shops" ON shops;
DROP POLICY IF EXISTS "Users can update own shops" ON shops;
DROP POLICY IF EXISTS "Users can delete own shops" ON shops;

-- Recreate policies with user_id
CREATE POLICY "Users can view own shops" ON shops
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own shops" ON shops
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own shops" ON shops
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own shops" ON shops
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Update index name if it exists
DROP INDEX IF EXISTS idx_shops_owner_id;
CREATE INDEX idx_shops_user_id ON shops(user_id);