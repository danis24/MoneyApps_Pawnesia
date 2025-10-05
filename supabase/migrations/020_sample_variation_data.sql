-- Sample data for product variations demonstration
-- This creates sample variation types, options, and product variations

-- Note: This assumes you have already created a sample product and user
-- Replace 'user_id_here' with actual user ID and 'product_id_here' with actual product ID

-- Insert sample variation types
INSERT INTO variation_types (name, description, user_id) VALUES
('Warna', 'Variasi warna produk', 'user_id_here'),
('Motif', 'Variasi motif produk', 'user_id_here'),
('Ukuran', 'Variasi ukuran produk', 'user_id_here')
ON CONFLICT (name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert sample variation options for colors
INSERT INTO variation_options (variation_type_id, name, description, user_id) VALUES
((SELECT id FROM variation_types WHERE name = 'Warna' AND user_id = 'user_id_here'), 'Biru', 'Warna biru cerah', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Warna' AND user_id = 'user_id_here'), 'Pink', 'Warna pink muda', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Warna' AND user_id = 'user_id_here'), 'Hijau', 'Warna hijau tosca', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Warna' AND user_id = 'user_id_here'), 'Ungu', 'Warna ungu lavender', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Warna' AND user_id = 'user_id_here'), 'Orange', 'Warna orange cerah', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Warna' AND user_id = 'user_id_here'), 'Kuning', 'Warna kuning lemon', 'user_id_here')
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert sample variation options for patterns
INSERT INTO variation_options (variation_type_id, name, description, user_id) VALUES
((SELECT id FROM variation_types WHERE name = 'Motif' AND user_id = 'user_id_here'), 'Polos', 'Tanpa motif tambahan', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Motif' AND user_id = 'user_id_here'), 'Tulang', 'Motif tulang anjing', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Motif' AND user_id = 'user_id_here'), 'Bintik', 'Motif bintik kecil', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Motif' AND user_id = 'user_id_here'), 'Garis', 'Motif garis vertikal', 'user_id_here')
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert sample variation options for accessories
INSERT INTO variation_options (variation_type_id, name, description, user_id) VALUES
((SELECT id FROM variation_types WHERE name = 'Ukuran' AND user_id = 'user_id_here'), 'Small', 'Ukuran kecil untuk anak kucing', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Ukuran' AND user_id = 'user_id_here'), 'Medium', 'Ukuran sedang untuk kucing dewasa', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Ukuran' AND user_id = 'user_id_here'), 'Large', 'Ukuran besar untuk anjing kecil', 'user_id_here'),
((SELECT id FROM variation_types WHERE name = 'Ukuran' AND user_id = 'user_id_here'), 'Tambah Lonceng', 'Aksesoris lonceng tambahan', 'user_id_here')
ON CONFLICT (variation_type_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert sample product variations for a specific product
-- Replace 'product_id_here' with actual product ID
INSERT INTO product_variations (product_id, name, sku, price_adjustment, stock_quantity, user_id) VALUES
('product_id_here', 'Biru Polos', 'KK-BIRU-P', 0, 50, 'user_id_here'),
('product_id_here', 'Biru Tulang', 'KK-BIRU-T', 2000, 30, 'user_id_here'),
('product_id_here', 'Pink Polos', 'KK-PINK-P', 0, 45, 'user_id_here'),
('product_id_here', 'Pink Tulang', 'KK-PINK-T', 2000, 25, 'user_id_here'),
('product_id_here', 'Hijau Polos', 'KK-HIJAU-P', 0, 40, 'user_id_here'),
('product_id_here', 'Hijau Tulang', 'KK-HIJAU-T', 2000, 20, 'user_id_here'),
('product_id_here', 'Ungu Polos', 'KK-UNGU-P', 0, 35, 'user_id_here'),
('product_id_here', 'Ungu Tulang', 'KK-UNGU-T', 2000, 15, 'user_id_here'),
('product_id_here', 'Orange Polos', 'KK-ORANGE-P', 0, 30, 'user_id_here'),
('product_id_here', 'Orange Tulang', 'KK-ORANGE-T', 2000, 20, 'user_id_here'),
('product_id_here', 'Kuning Polos', 'KK-KUNING-P', 0, 25, 'user_id_here'),
('product_id_here', 'Kuning Tulang', 'KK-KUNING-T', 2000, 15, 'user_id_here'),
('product_id_here', 'Biru Polos + Lonceng', 'KK-BIRU-PL', 3000, 20, 'user_id_here'),
('product_id_here', 'Pink Polos + Lonceng', 'KK-PINK-PL', 3000, 18, 'user_id_here'),
('product_id_here', 'Hijau Polos + Lonceng', 'KK-HIJAU-PL', 3000, 15, 'user_id_here')
ON CONFLICT (product_id, name, user_id) WHERE name IS NOT NULL DO NOTHING;

-- Insert variation combinations
-- This links each product variation to its variation options
INSERT INTO variation_combinations (product_variation_id, variation_option_id, user_id)
SELECT
    pv.id as product_variation_id,
    vo.id as variation_option_id,
    'user_id_here' as user_id
FROM product_variations pv
CROSS JOIN variation_options vo
WHERE pv.user_id = 'user_id_here'
    AND vo.user_id = 'user_id_here'
    AND (
        -- Color combinations
        (pv.name LIKE '%Biru%' AND vo.name = 'Biru') OR
        (pv.name LIKE '%Pink%' AND vo.name = 'Pink') OR
        (pv.name LIKE '%Hijau%' AND vo.name = 'Hijau') OR
        (pv.name LIKE '%Ungu%' AND vo.name = 'Ungu') OR
        (pv.name LIKE '%Orange%' AND vo.name = 'Orange') OR
        (pv.name LIKE '%Kuning%' AND vo.name = 'Kuning') OR
        -- Pattern combinations
        (pv.name LIKE '%Polos' AND vo.name = 'Polos') OR
        (pv.name LIKE '%Tulang' AND vo.name = 'Tulang') OR
        -- Accessory combinations
        (pv.name LIKE '%Lonceng' AND vo.name = 'Tambah Lonceng')
    )
ON CONFLICT (product_variation_id, variation_option_id) DO NOTHING;