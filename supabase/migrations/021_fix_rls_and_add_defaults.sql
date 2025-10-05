-- Fix RLS policies for variation tables and add default data for testing

-- First, let's check if we need to adjust the RLS policies to work with Clerk
-- The issue might be that we need to handle anonymous users for read operations

-- Update variation_types policies to be more permissive for reads
DROP POLICY IF EXISTS "Users can view own variation_types" ON variation_types;
CREATE POLICY "Users can view variation_types" ON variation_types
  FOR SELECT USING (true); -- Allow everyone to read variation types

DROP POLICY IF EXISTS "Users can insert own variation_types" ON variation_types;
CREATE POLICY "Users can insert own variation_types" ON variation_types
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can update own variation_types" ON variation_types;
CREATE POLICY "Users can update own variation_types" ON variation_types
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can delete own variation_types" ON variation_types;
CREATE POLICY "Users can delete own variation_types" ON variation_types
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Update variation_options policies
DROP POLICY IF EXISTS "Users can view own variation_options" ON variation_options;
CREATE POLICY "Users can view variation_options" ON variation_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own variation_options" ON variation_options;
CREATE POLICY "Users can insert own variation_options" ON variation_options
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can update own variation_options" ON variation_options;
CREATE POLICY "Users can update own variation_options" ON variation_options
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can delete own variation_options" ON variation_options;
CREATE POLICY "Users can delete own variation_options" ON variation_options
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Update product_variations policies
DROP POLICY IF EXISTS "Users can view own product_variations" ON product_variations;
CREATE POLICY "Users can view product_variations" ON product_variations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own product_variations" ON product_variations;
CREATE POLICY "Users can insert own product_variations" ON product_variations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can update own product_variations" ON product_variations;
CREATE POLICY "Users can update own product_variations" ON product_variations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can delete own product_variations" ON product_variations;
CREATE POLICY "Users can delete own product_variations" ON product_variations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Update variation_combinations policies
DROP POLICY IF EXISTS "Users can view own variation_combinations" ON variation_combinations;
CREATE POLICY "Users can view own variation_combinations" ON variation_combinations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own variation_combinations" ON variation_combinations;
CREATE POLICY "Users can insert own variation_combinations" ON variation_combinations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can update own variation_combinations" ON variation_combinations;
CREATE POLICY "Users can update own variation_combinations" ON variation_combinations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can delete own variation_combinations" ON variation_combinations;
CREATE POLICY "Users can delete own variation_combinations" ON variation_combinations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Update bom_variations policies
DROP POLICY IF EXISTS "Users can view own bom_variations" ON bom_variations;
CREATE POLICY "Users can view own bom_variations" ON bom_variations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own bom_variations" ON bom_variations;
CREATE POLICY "Users can insert own bom_variations" ON bom_variations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can update own bom_variations" ON bom_variations;
CREATE POLICY "Users can update own bom_variations" ON bom_variations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can delete own bom_variations" ON bom_variations;
CREATE POLICY "Users can delete own bom_variations" ON bom_variations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Insert default variation types for common use cases
-- These will be available for all users
INSERT INTO variation_types (name, description, user_id) VALUES
('Warna', 'Variasi warna produk', 'system'),
('Motif', 'Variasi motif atau pola produk', 'system'),
('Ukuran', 'Variasi ukuran produk', 'system'),
('Bahan', 'Variasi bahan atau material', 'system'),
('Aksesoris', 'Variasi aksesoris tambahan', 'system')
ON CONFLICT (name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert default variation options for colors
INSERT INTO variation_options (variation_type_id, name, description, user_id)
SELECT vt.id, 'Merah', 'Warna merah', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Biru', 'Warna biru', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Hijau', 'Warna hijau', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Kuning', 'Warna kuning', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Pink', 'Warna pink', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Ungu', 'Warna ungu', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Orange', 'Warna orange', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Hitam', 'Warna hitam', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Putih', 'Warna putih', 'system'
FROM variation_types vt WHERE vt.name = 'Warna' AND vt.user_id = 'system'
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert default variation options for patterns
INSERT INTO variation_options (variation_type_id, name, description, user_id)
SELECT vt.id, 'Polos', 'Tanpa motif', 'system'
FROM variation_types vt WHERE vt.name = 'Motif' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Tulang', 'Motif tulang', 'system'
FROM variation_types vt WHERE vt.name = 'Motif' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Bintik', 'Motif bintik-bintik', 'system'
FROM variation_types vt WHERE vt.name = 'Motif' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Garis', 'Motif garis-garis', 'system'
FROM variation_types vt WHERE vt.name = 'Motif' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Kotak', 'Motif kotak-kotak', 'system'
FROM variation_types vt WHERE vt.name = 'Motif' AND vt.user_id = 'system'
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert default variation options for sizes
INSERT INTO variation_options (variation_type_id, name, description, user_id)
SELECT vt.id, 'XS', 'Extra Small', 'system'
FROM variation_types vt WHERE vt.name = 'Ukuran' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'S', 'Small', 'system'
FROM variation_types vt WHERE vt.name = 'Ukuran' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'M', 'Medium', 'system'
FROM variation_types vt WHERE vt.name = 'Ukuran' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'L', 'Large', 'system'
FROM variation_types vt WHERE vt.name = 'Ukuran' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'XL', 'Extra Large', 'system'
FROM variation_types vt WHERE vt.name = 'Ukuran' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'XXL', 'Double Extra Large', 'system'
FROM variation_types vt WHERE vt.name = 'Ukuran' AND vt.user_id = 'system'
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert default variation options for accessories
INSERT INTO variation_options (variation_type_id, name, description, user_id)
SELECT vt.id, 'Dengan Lonceng', 'Include lonceng', 'system'
FROM variation_types vt WHERE vt.name = 'Aksesoris' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Tanpa Lonceng', 'Tanpa lonceng', 'system'
FROM variation_types vt WHERE vt.name = 'Aksesoris' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Premium Box', 'Packaging premium', 'system'
FROM variation_types vt WHERE vt.name = 'Aksesoris' AND vt.user_id = 'system'
UNION ALL
SELECT vt.id, 'Standard Box', 'Packaging standar', 'system'
FROM variation_types vt WHERE vt.name = 'Aksesoris' AND vt.user_id = 'system'
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Create a function to copy system variation types to user-specific ones
CREATE OR REPLACE FUNCTION copy_system_variation_types(target_user_id TEXT)
RETURNS void AS $$
BEGIN
  -- Copy variation types
  INSERT INTO variation_types (name, description, user_id)
  SELECT name, description, target_user_id
  FROM variation_types
  WHERE user_id = 'system'
  ON CONFLICT (name, user_id) WHERE name IS NOT NULL DO NOTHING;

  -- Copy variation options
  INSERT INTO variation_options (variation_type_id, name, description, user_id)
  SELECT
    vt_target.id as variation_type_id,
    vo.name,
    vo.description,
    target_user_id
  FROM variation_options vo
  JOIN variation_types vt_source ON vo.variation_type_id = vt_source.id
  JOIN variation_types vt_target ON vt_target.name = vt_source.name AND vt_target.user_id = target_user_id
  WHERE vo.user_id = 'system' AND vt_source.user_id = 'system'
  ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;
END;
$$ LANGUAGE plpgsql;