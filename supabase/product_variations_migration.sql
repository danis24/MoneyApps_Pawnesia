-- Product Variations System - Complete SQL Migration
-- Execute this in the Supabase SQL Editor

-- Create variation_types table for managing variation types (e.g., color, size, pattern)
CREATE TABLE IF NOT EXISTS variation_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "Warna", "Ukuran", "Motif"
  description TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variation_options table for managing variation options (e.g., "Merah", "Biru", "S", "M")
CREATE TABLE IF NOT EXISTS variation_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  variation_type_id UUID REFERENCES variation_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Biru", "Pink", "Hijau", "Ungu", "Orange", "Kuning"
  description TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_variations table for linking variations to products with specific prices
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Biru", "Biru + Lonceng", "Pink", "Pink + Lonceng"
  sku TEXT,
  price_adjustment DECIMAL(12,2) DEFAULT 0, -- Price difference from base product
  final_price DECIMAL(12,2) DEFAULT 0, -- Will be calculated by trigger
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variation_combinations table to store which options make up each variation
CREATE TABLE IF NOT EXISTS variation_combinations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_variation_id UUID REFERENCES product_variations(id) ON DELETE CASCADE,
  variation_option_id UUID REFERENCES variation_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bom_variations table for variation-specific Bill of Materials
CREATE TABLE IF NOT EXISTS bom_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_variation_id UUID REFERENCES product_variations(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE variation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE variation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variation_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_variations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with public read access for variation tables
-- variation_types policies
DROP POLICY IF EXISTS "Users can view variation_types" ON variation_types;
CREATE POLICY "Users can view variation_types" ON variation_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own variation_types" ON variation_types;
CREATE POLICY "Users can insert own variation_types" ON variation_types
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can update own variation_types" ON variation_types;
CREATE POLICY "Users can update own variation_types" ON variation_types
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

DROP POLICY IF EXISTS "Users can delete own variation_types" ON variation_types;
CREATE POLICY "Users can delete own variation_types" ON variation_types
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- variation_options policies
DROP POLICY IF EXISTS "Users can view variation_options" ON variation_options;
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

-- product_variations policies
DROP POLICY IF EXISTS "Users can view product_variations" ON product_variations;
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

-- variation_combinations policies
DROP POLICY IF EXISTS "Users can view variation_combinations" ON variation_combinations;
CREATE POLICY "Users can view variation_combinations" ON variation_combinations
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

-- bom_variations policies
DROP POLICY IF EXISTS "Users can view bom_variations" ON bom_variations;
CREATE POLICY "Users can view bom_variations" ON bom_variations
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_variation_types_user_id ON variation_types(user_id);
CREATE INDEX IF NOT EXISTS idx_variation_options_variation_type_id ON variation_options(variation_type_id);
CREATE INDEX IF NOT EXISTS idx_variation_options_user_id ON variation_options(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_user_id ON product_variations(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_is_active ON product_variations(is_active);
CREATE INDEX IF NOT EXISTS idx_variation_combinations_product_variation_id ON variation_combinations(product_variation_id);
CREATE INDEX IF NOT EXISTS idx_variation_combinations_variation_option_id ON variation_combinations(variation_option_id);
CREATE INDEX IF NOT EXISTS idx_variation_combinations_user_id ON variation_combinations(user_id);
CREATE INDEX IF NOT EXISTS idx_bom_variations_product_variation_id ON bom_variations(product_variation_id);
CREATE INDEX IF NOT EXISTS idx_bom_variations_material_id ON bom_variations(material_id);
CREATE INDEX IF NOT EXISTS idx_bom_variations_shop_id ON bom_variations(shop_id);
CREATE INDEX IF NOT EXISTS idx_bom_variations_user_id ON bom_variations(user_id);
CREATE INDEX IF NOT EXISTS idx_bom_variations_is_active ON bom_variations(is_active);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_variation_types_name_user ON variation_types(name, user_id) WHERE name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_variation_options_variation_type_name_user ON variation_options(variation_type_id, name, user_id) WHERE name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variations_product_name_user ON product_variations(product_id, name, user_id) WHERE name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_variation_combinations_variation_option ON variation_combinations(product_variation_id, variation_option_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bom_variations_product_material ON bom_variations(product_variation_id, material_id) WHERE is_active = true;

-- Create function to calculate final price for product variations
CREATE OR REPLACE FUNCTION calculate_final_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate final price when inserting or updating variation
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.final_price = COALESCE(
      (SELECT price FROM products WHERE id = NEW.product_id), 0
    ) + COALESCE(NEW.price_adjustment, 0);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to update variation price when base product price changes
CREATE OR REPLACE FUNCTION update_variation_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all variation final prices when base product price changes
  UPDATE product_variations
  SET final_price = NEW.price + COALESCE(price_adjustment, 0)
  WHERE product_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calculating final price on insert/update
DROP TRIGGER IF EXISTS product_variation_price_trigger ON product_variations;
CREATE TRIGGER product_variation_price_trigger
  BEFORE INSERT OR UPDATE ON product_variations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_final_price();

-- Create trigger for product price updates
DROP TRIGGER IF EXISTS product_price_update_trigger ON products;
CREATE TRIGGER product_price_update_trigger
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (NEW.price IS DISTINCT FROM OLD.price)
  EXECUTE FUNCTION update_variation_prices();

-- Insert default variation types for common use cases
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