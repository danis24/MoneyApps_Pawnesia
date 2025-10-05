-- Add product variations and BOM variations support
-- This migration adds support for product variations (like colors, patterns)
-- and variation-specific Bill of Materials

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

-- Create RLS policies for variation_types
CREATE POLICY "Users can view own variation_types" ON variation_types
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own variation_types" ON variation_types
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own variation_types" ON variation_types
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own variation_types" ON variation_types
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create RLS policies for variation_options
CREATE POLICY "Users can view own variation_options" ON variation_options
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own variation_options" ON variation_options
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own variation_options" ON variation_options
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own variation_options" ON variation_options
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create RLS policies for product_variations
CREATE POLICY "Users can view own product_variations" ON product_variations
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own product_variations" ON product_variations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own product_variations" ON product_variations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own product_variations" ON product_variations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create RLS policies for variation_combinations
CREATE POLICY "Users can view own variation_combinations" ON variation_combinations
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own variation_combinations" ON variation_combinations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own variation_combinations" ON variation_combinations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own variation_combinations" ON variation_combinations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create RLS policies for bom_variations
CREATE POLICY "Users can view own bom_variations" ON bom_variations
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own bom_variations" ON bom_variations
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own bom_variations" ON bom_variations
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own bom_variations" ON bom_variations
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX idx_variation_types_user_id ON variation_types(user_id);
CREATE INDEX idx_variation_options_variation_type_id ON variation_options(variation_type_id);
CREATE INDEX idx_variation_options_user_id ON variation_options(user_id);
CREATE INDEX idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX idx_product_variations_user_id ON product_variations(user_id);
CREATE INDEX idx_product_variations_is_active ON product_variations(is_active);
CREATE INDEX idx_variation_combinations_product_variation_id ON variation_combinations(product_variation_id);
CREATE INDEX idx_variation_combinations_variation_option_id ON variation_combinations(variation_option_id);
CREATE INDEX idx_variation_combinations_user_id ON variation_combinations(user_id);
CREATE INDEX idx_bom_variations_product_variation_id ON bom_variations(product_variation_id);
CREATE INDEX idx_bom_variations_material_id ON bom_variations(material_id);
CREATE INDEX idx_bom_variations_shop_id ON bom_variations(shop_id);
CREATE INDEX idx_bom_variations_user_id ON bom_variations(user_id);
CREATE INDEX idx_bom_variations_is_active ON bom_variations(is_active);

-- Create unique constraints
CREATE UNIQUE INDEX idx_variation_types_name_user ON variation_types(name, user_id) WHERE name IS NOT NULL;
CREATE UNIQUE INDEX idx_variation_options_variation_type_name_user ON variation_options(variation_type_id, name, user_id) WHERE name IS NOT NULL;
CREATE UNIQUE INDEX idx_product_variations_product_name_user ON product_variations(product_id, name, user_id) WHERE name IS NOT NULL;
CREATE UNIQUE INDEX idx_variation_combinations_variation_option ON variation_combinations(product_variation_id, variation_option_id);
CREATE UNIQUE INDEX idx_bom_variations_product_material ON bom_variations(product_variation_id, material_id) WHERE is_active = true;

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
CREATE TRIGGER product_variation_price_trigger
  BEFORE INSERT OR UPDATE ON product_variations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_final_price();

-- Create trigger for product price updates
CREATE TRIGGER product_price_update_trigger
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (NEW.price IS DISTINCT FROM OLD.price)
  EXECUTE FUNCTION update_variation_prices();

-- Insert default variation types for all users
-- This will be handled by the application layer when users first use the feature