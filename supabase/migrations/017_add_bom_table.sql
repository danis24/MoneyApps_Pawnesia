-- Create Bill of Materials (BOM) table for tracking product compositions
CREATE TABLE IF NOT EXISTS bill_of_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
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

-- Enable RLS on the bill_of_materials table
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bill_of_materials
CREATE POLICY "Users can view own bill_of_materials" ON bill_of_materials
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own bill_of_materials" ON bill_of_materials
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own bill_of_materials" ON bill_of_materials
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own bill_of_materials" ON bill_of_materials
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create unique constraint to prevent duplicate product-material combinations
CREATE UNIQUE INDEX idx_bill_of_materials_product_material ON bill_of_materials(product_id, material_id) WHERE is_active = true;

-- Create indexes for better performance
CREATE INDEX idx_bill_of_materials_user_id ON bill_of_materials(user_id);
CREATE INDEX idx_bill_of_materials_shop_id ON bill_of_materials(shop_id);
CREATE INDEX idx_bill_of_materials_product_id ON bill_of_materials(product_id);
CREATE INDEX idx_bill_of_materials_material_id ON bill_of_materials(material_id);
CREATE INDEX idx_bill_of_materials_is_active ON bill_of_materials(is_active);

-- Create function to update product cost when BOM changes
CREATE OR REPLACE FUNCTION update_product_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product cost based on sum of BOM material costs
  UPDATE products
  SET cost_price = COALESCE(
    (
      SELECT SUM(total_cost)
      FROM bill_of_materials
      WHERE bill_of_materials.product_id = products.id
      AND bill_of_materials.is_active = true
    ), 0
  )
  WHERE products.id = NEW.product_id OR products.id = OLD.product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for BOM changes
CREATE TRIGGER bom_after_insert_trigger
  AFTER INSERT OR UPDATE ON bill_of_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cost();

CREATE TRIGGER bom_after_delete_trigger
  AFTER DELETE OR UPDATE ON bill_of_materials
  FOR EACH ROW
  WHEN (OLD.is_active = true)
  EXECUTE FUNCTION update_product_cost();

-- Add cost_price column to products table if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) DEFAULT 0;