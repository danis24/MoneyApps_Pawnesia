// Types for product variations and BOM variations

export interface VariationType {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface VariationOption {
  id: string;
  variation_type_id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  variation_type?: VariationType;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price_adjustment: number;
  final_price: number; // Calculated by trigger: base product price + adjustment
  stock_quantity: number;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  combinations?: VariationCombination[];
  bom_variations?: BOMVariation[];
}

export interface VariationCombination {
  id: string;
  product_variation_id: string;
  variation_option_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  variation_option?: VariationOption;
}

export interface BOMVariation {
  id: string;
  product_variation_id: string;
  material_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes?: string;
  is_active: boolean;
  shop_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  product_variation?: ProductVariation;
  material?: Material;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  cost_price: number;
  stock_quantity?: number;
  category_id?: string;
  shop_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variations?: ProductVariation[];
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  unit_cost: number;
  quantity_on_hand: number;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  sku?: string;
  is_active: boolean;
  shop_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface BOMItem {
  id: string;
  product_id: string;
  material_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes?: string;
  is_active: boolean;
  shop_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  material?: Material;
}

export interface ProductWithBOM extends Product {
  bom_items: BOMItem[];
  total_material_cost: number;
  profit_margin: number;
}

// Form types for handling variations
export interface VariationForm {
  name: string;
  description?: string;
}

export interface VariationOptionForm {
  variation_type_id: string;
  name: string;
  description?: string;
}

export interface ProductVariationForm {
  name: string;
  sku?: string;
  price_adjustment: number;
  stock_quantity: number;
  selected_options: string[]; // Array of variation option IDs
}

export interface BOMVariationForm {
  material_id: string;
  quantity: number;
  unit_cost: string;
  notes?: string;
}

// Types for variation management
export interface VariationWithType extends VariationOption {
  variation_type_name: string;
}

export interface ProductVariationWithDetails extends ProductVariation {
  option_names: string[];
  total_bom_cost: number;
}