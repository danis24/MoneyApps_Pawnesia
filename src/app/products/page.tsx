"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Layers,
  Palette,
  Info,
  TrendingUp,
  Target,
  DollarSign,
  Zap,
  Lightbulb,
  Calculator,
  BarChart3,
} from "lucide-react";
import VariationManager from "@/components/variation-manager";
import { createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";
import type {
  ProductVariationWithDetails,
  BOMVariation
} from "@/types/variations";

// Product interfaces with BOM support
interface BOMItem {
  id: string;
  material_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  material?: {
    id: string;
    name: string;
    unit: string;
    unit_price: number;
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  bom_items?: BOMItem[];
  bom_count?: number;
  variations?: ProductVariationWithDetails[];
  total_bom_cost?: number;
  base_bom_cost?: number;
  variation_bom_cost?: number;
  variation_details?: any[];
}

interface Material {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  type: "Jasa" | "Bahan";
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ProductKPI {
  id: string;
  product_id: string;
  hpp: number;
  selling_price: number;
  profit_margin: number;
  recommended_roas: number;
  minimal_roas: number;
  current_roas?: number;
  advertising_cost?: number;
  revenue?: number;
  orders?: number;
  conversion_rate?: number;
  ai_recommendations?: AIRecommendation[];
  hpp_breakdown?: string;
}

interface AIRecommendation {
  id: string;
  type: 'pricing' | 'advertising' | 'marketing' | 'inventory';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_items: string[];
  expected_impact: string;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productKPIs, setProductKPIs] = useState<ProductKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);
  const [selectedProductForAI, setSelectedProductForAI] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedProductForVariations, setSelectedProductForVariations] = useState<Product | null>(null);
  const [showVariationDetailsDialog, setShowVariationDetailsDialog] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: "",
    category_id: "",
  });

  const [materialForm, setMaterialForm] = useState({
    name: "",
    sku: "",
    unit: "",
    unit_price: "",
    current_stock: "",
    min_stock: "",
    type: "Bahan" as "Jasa" | "Bahan",
  });

  const { user, isSignedIn } = useCurrentUser();
  const { getToken, userId } = useAuth();

  // Client-side data fetching with auth
  useEffect(() => {
    if (isSignedIn && user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user]);

  // Auto-update SKU when materials change and dialog is open for new material
  useEffect(() => {
    if (showMaterialDialog && !editingMaterial && materials.length > 0) {
      const nextSKU = generateNextMaterialSKU();
      setMaterialForm(prev => ({
        ...prev,
        sku: nextSKU
      }));
    }
  }, [materials, showMaterialDialog, editingMaterial]);

  const showVariationDetails = (product: Product) => {
    setSelectedProductForDetails(product);
    setShowVariationDetailsDialog(true);
  };

  const generateNextMaterialSKU = () => {
    // Filter materials with SKU pattern PRDXXXX
    const materialsWithPRDSKU = materials.filter(material =>
      material.sku && material.sku.startsWith('PRD')
    );

    // Extract numbers from SKUs and find the highest
    const numbers = materialsWithPRDSKU
      .map(material => {
        const match = material.sku.match(/PRD(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);

    const highestNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = highestNumber + 1;

    // Format with leading zeros (4 digits)
    return `PRD${nextNumber.toString().padStart(4, '0')}`;
  };

  const calculateProductKPI = (product: Product): ProductKPI => {
    // Use average HPP for products with variations
    const baseBOMCost = product.base_bom_cost || 0;
    const totalVariationBOMCost = product.variation_bom_cost || 0;
    const variationCount = product.variations?.length || 0;

    // Calculate HPP based on product type
    let hpp: number;
    let hppBreakdown: string;

    if (variationCount > 0) {
      // For products with variations, use average HPP
      const avgVariationBOMCost = totalVariationBOMCost / variationCount;
      hpp = baseBOMCost + avgVariationBOMCost;
      hppBreakdown = `Base: Rp ${baseBOMCost.toLocaleString("id-ID")} + Avg Variasi: Rp ${avgVariationBOMCost.toLocaleString("id-ID")} (${variationCount} variasi)`;
    } else {
      // For products without variations, use base BOM only
      hpp = baseBOMCost;
      hppBreakdown = `Base BOM: Rp ${baseBOMCost.toLocaleString("id-ID")}`;
    }

    const sellingPrice = product.price || 0;
    const profitMargin = sellingPrice > 0 ? ((sellingPrice - hpp) / sellingPrice) * 100 : 0;

    // Calculate minimal ROAS (break-even point)
    const minimalROAS = sellingPrice > 0 ? sellingPrice / (sellingPrice - hpp) : 2;

    // Calculate recommended ROAS (target 30-50% profit after ad spend)
    const recommendedROAS = minimalROAS * 1.5;

    // Generate AI recommendations based on product performance
    const aiRecommendations: AIRecommendation[] = [];

    // Pricing recommendations
    if (profitMargin < 20) {
      aiRecommendations.push({
        id: `pricing_${product.id}`,
        type: 'pricing',
        priority: 'high',
        title: 'Optimasi Harga Jual',
        description: `Margin laba saat ini ${profitMargin.toFixed(1)}% di bawah rekomendasi (20%+).`,
        action_items: [
          `Pertimbangkan naikkan harga menjadi Rp ${(sellingPrice * 1.15).toLocaleString("id-ID")}`,
          `Negosiasi harga bahan baku dengan supplier`,
          `Cari supplier alternatif untuk mengurangi HPP`
        ],
        expected_impact: 'Meningkatkan margin laba menjadi 25-30%',
        implementation_difficulty: 'medium'
      });
    }

    // Advertising recommendations
    if (profitMargin >= 30) {
      aiRecommendations.push({
        id: `advertising_${product.id}`,
        type: 'advertising',
        priority: 'high',
        title: 'Scale Up Iklan',
        description: `Margin laba ${profitMargin.toFixed(1)}% memungkinkan untuk scaling iklan agresif.`,
        action_items: [
          `Target ROAS ${recommendedROAS.toFixed(1)}x untuk scaling`,
          `Tambahkan budget iklan 20-50%`,
          `Test multiple ad platforms (TikTok, Facebook, Google)`
        ],
        expected_impact: 'Meningkatkan revenue 50-100%',
        implementation_difficulty: 'easy'
      });
    } else if (profitMargin >= 20) {
      aiRecommendations.push({
        id: `advertising_${product.id}`,
        type: 'advertising',
        priority: 'medium',
        title: 'Moderate Advertising',
        description: `Margin laba ${profitMargin.toFixed(1)}% cukup untuk iklan moderat.`,
        action_items: [
          `Target ROAS minimal ${minimalROAS.toFixed(1)}x`,
          `Fokus pada organic marketing dulu`,
          `Test dengan budget kecil Rp 500.000 - 1.000.000`
        ],
        expected_impact: 'Validasi product-market fit',
        implementation_difficulty: 'easy'
      });
    }

    // Marketing recommendations
    if (product.variations && product.variations.length > 0) {
      aiRecommendations.push({
        id: `marketing_${product.id}`,
        type: 'marketing',
        priority: 'medium',
        title: 'Leverage Variasi Produk',
        description: `${product.variations.length} variasi bisa jadi selling point utama.`,
        action_items: [
          `Buat iklan terpisah untuk setiap variasi`,
          `Highlight variasi paling populer`,
          `Bundle variasi untuk meningkatkan AOV`
        ],
        expected_impact: 'Meningkatkan conversion rate 15-25%',
        implementation_difficulty: 'easy'
      });
    }

    // Inventory recommendations
    if (product.bom_count === 0) {
      aiRecommendations.push({
        id: `inventory_${product.id}`,
        type: 'inventory',
        priority: 'high',
        title: 'Setup BOM System',
        description: 'Belum ada BOM tracking, sulit monitor profitabilitas.',
        action_items: [
          `Setup Bill of Materials untuk semua produk`,
          `Track inventory dan COGS secara real-time`,
          `Implement variation tracking`
        ],
        expected_impact: 'Akurasi profit tracking 100%',
        implementation_difficulty: 'hard'
      });
    }

    // Marketplace recommendations
    const shopeeFeePercent = 0.075;
    const shopeeFixedFee = 1250;
    const shopeeTotalFee = (sellingPrice * shopeeFeePercent) + shopeeFixedFee;
    const shopeeNetRevenue = sellingPrice - shopeeTotalFee;
    const shopeeNetProfit = shopeeNetRevenue - hpp;
    const shopeeNetMargin = shopeeNetRevenue > 0 ? (shopeeNetProfit / shopeeNetRevenue) * 100 : 0;

    const tiktokFeePercent = 0.085;
    const tiktokNetRevenue = sellingPrice * (1 - tiktokFeePercent);
    const tiktokNetProfit = tiktokNetRevenue - hpp;
    const tiktokNetMargin = tiktokNetRevenue > 0 ? (tiktokNetProfit / tiktokNetRevenue) * 100 : 0;

    // Shopee recommendations
    if (shopeeNetMargin >= 15) {
      aiRecommendations.push({
        id: `shopee_ready_${product.id}`,
        type: 'advertising',
        priority: 'high',
        title: 'Ready for Shopee Ads',
        description: `Margin Shopee ${shopeeNetMargin.toFixed(1)}% sudah optimal untuk iklan.`,
        action_items: [
          `Start Shopee Search Ads dengan budget Rp 500.000 - 1.000.000`,
          `Target ROAS minimal ${(minimalROAS * 1.2).toFixed(1)}x`,
          `Optimalkan produk untuk Free Shipping campaign`,
          `Gunakan discovery ads untuk brand awareness`
        ],
        expected_impact: 'Additional 20-50 sales per month dari Shopee',
        implementation_difficulty: 'medium'
      });
    } else if (shopeeNetMargin >= 10) {
      aiRecommendations.push({
        id: `shopee_optimize_${product.id}`,
        type: 'pricing',
        priority: 'medium',
        title: 'Optimize for Shopee',
        description: `Margin Shopee ${shopeeNetMargin.toFixed(1)}% perlu sedikit penyesuaian.`,
        action_items: [
          `Pertimbangkan naikkan harga Rp ${Math.ceil((sellingPrice * 1.05) - sellingPrice)} untuk margin 15%+`,
          `Negosiasi fee dengan Shopee jika volume besar`,
          `Test dengan budget kecil Rp 300.000 dulu`
        ],
        expected_impact: 'Mencapai margin 15%+ untuk Shopee ads',
        implementation_difficulty: 'easy'
      });
    } else {
      aiRecommendations.push({
        id: `shopee_not_ready_${product.id}`,
        type: 'pricing',
        priority: 'high',
        title: 'Shopee Not Profitable',
        description: `Margin Shopee ${shopeeNetMargin.toFixed(1)}% terlalu rendih untuk marketplace.`,
        action_items: [
          `Fokus optimasi HPP dulu sebelum sell di marketplace`,
          `Pertimbangkan price increase minimal 15-20%`,
          `Cari supplier dengan harga lebih baik`
        ],
        expected_impact: 'Mencapai margin 10%+ untuk marketplace',
        implementation_difficulty: 'hard'
      });
    }

    // TikTok recommendations
    if (tiktokNetMargin >= 15) {
      aiRecommendations.push({
        id: `tiktok_ready_${product.id}`,
        type: 'advertising',
        priority: 'high',
        title: 'Ready for TikTok Shop',
        description: `Margin TikTok ${tiktokNetMargin.toFixed(1)}% optimal untuk video marketing.`,
        action_items: [
          `Buat product showcase video untuk TikTok`,
          `Start TikTok Shop dengan budget Rp 300.000 - 800.000`,
          `Collaborasi dengan micro-influencers`,
          `Focus pada video yang viral dan entertaining`
        ],
        expected_impact: 'Potensi viral reach dan 30-100+ sales',
        implementation_difficulty: 'medium'
      });
    } else if (tiktokNetMargin >= 8) {
      aiRecommendations.push({
        id: `tiktok_marginal_${product.id}`,
        type: 'marketing',
        priority: 'medium',
        title: 'TikTok Shop - Marginal',
        description: `Margin TikTok ${tiktokNetMargin.toFixed(1)}% masih bisa dicoba.`,
        action_items: [
          `Test dengan 1-2 video content dulu`,
          `Gunakan organic TikTok untuk brand building`,
          `Consider TikTok ads jika ada viral potential`
        ],
        expected_impact: 'Test market response sebelum full commitment',
        implementation_difficulty: 'easy'
      });
    }

    return {
      id: `kpi_${product.id}`,
      product_id: product.id,
      hpp,
      selling_price: sellingPrice,
      profit_margin: profitMargin,
      recommended_roas: recommendedROAS,
      minimal_roas: minimalROAS,
      hpp_breakdown: hppBreakdown,
      ai_recommendations: aiRecommendations
    };
  };

  const showAIAnalysis = (product: Product) => {
    setSelectedProductForAI(product);
    setShowAIAnalysisDialog(true);
  };

  const fetchData = async () => {
    try {
      const token = await getToken();

      // Configure supabase with auth token
      const authSupabase = createSupabaseClientWithAuth(token);

      // Fetch data in parallel
      const [
        productsResponse,
        materialsResponse,
        categoriesResponse,
        variationsResponse,
        bomVariationsResponse
      ] = await Promise.all([
        authSupabase
          .from("products")
          .select(`
            *,
            categories (
              name
            ),
            bill_of_materials (
              id,
              quantity,
              unit_cost,
              total_cost,
              material:materials (
                id,
                name,
                unit,
                unit_price
              )
            )
          `)
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),

        authSupabase
          .from("materials")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),

        authSupabase
          .from("categories")
          .select("*")
          .eq("user_id", user?.id)
          .order("name"),

        authSupabase
          .from("product_variations")
          .select(`
            *,
            variation_combinations (
              variation_options (
                *,
                variation_types (name)
              )
            )
          `)
          .eq("user_id", user?.id)
          .eq("is_active", true)
          .order("name"),

        authSupabase
          .from("bom_variations")
          .select(`
            *,
            product_variation:product_variations (
              id,
              name,
              product_id,
              final_price
            ),
            material:materials (
              id,
              name,
              unit,
              unit_price
            )
          `)
          .eq("user_id", user?.id)
          .eq("is_active", true)
      ]);

      // Process variations data
      const variationsWithDetails = (variationsResponse.data || []).map(variation => {
        const combinations = variation.variation_combinations || [];
        const optionNames = combinations
          .map(c => c.variation_options?.name)
          .filter(Boolean) as string[];

        return {
          ...variation,
          option_names: optionNames,
          combinations: combinations
        };
      });

      // Process products with BOM and variations information
      const processedProducts = (productsResponse.data || []).map(product => {
        const productVariations = variationsWithDetails.filter(v => v.product_id === product.id);
        const bomVariations = (bomVariationsResponse.data || []).filter(bv =>
          productVariations.some(pv => pv.id === bv.product_variation_id)
        );

        // Calculate base BOM cost
        const baseBOMCost = (product.bill_of_materials || []).reduce((sum, bom) => sum + (bom.total_cost || 0), 0);

        // Calculate variation-specific BOM costs
        let variationBOMCost = 0;
        let variationDetails: any[] = [];

        productVariations.forEach(variation => {
          const variationBOMs = bomVariations.filter(bv => bv.product_variation_id === variation.id);
          const variationTotalCost = variationBOMs.reduce((sum, bv) => sum + (bv.total_cost || 0), 0);

          if (variationBOMs.length > 0) {
            variationBOMCost += variationTotalCost;
            variationDetails.push({
              variation_name: variation.name,
              variation_options: variation.option_names,
              bom_count: variationBOMs.length,
              total_cost: variationTotalCost,
              final_price: variation.final_price
            });
          }
        });

        // For display purposes in product list, show average total BOM cost
        const totalBOMCost = productVariations.length > 0
          ? baseBOMCost + (variationBOMCost / productVariations.length)
          : baseBOMCost;

        return {
          ...product,
          bom_items: product.bill_of_materials || [],
          bom_count: (product.bill_of_materials || []).length + bomVariations.length,
          variations: productVariations,
          total_bom_cost: totalBOMCost,
          base_bom_cost: baseBOMCost,
          variation_bom_cost: variationBOMCost,
          variation_details: variationDetails
        };
      });

      setProducts(processedProducts);
      setMaterials(materialsResponse.data || []);
      setCategories(categoriesResponse.data || []);

      // Calculate KPIs for all products
      const kpis = processedProducts.map(calculateProductKPI);
      setProductKPIs(kpis);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      sku: "",
      price: "",
      category_id: "",
    });
    setEditingProduct(null);
  };

  const resetMaterialForm = () => {
    const nextSKU = generateNextMaterialSKU();
    setMaterialForm({
      name: "",
      sku: nextSKU,
      unit: "",
      unit_price: "",
      current_stock: "",
      min_stock: "",
      type: "Bahan",
    });
    setEditingMaterial(null);
  };

  // CRUD Operations with client-side auth
  const saveProduct = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      if (editingProduct) {
        // Update existing product
        const { error } = await authSupabase
          .from("products")
          .update({
            name: productForm.name,
            sku: productForm.sku,
            price: parseFloat(productForm.price),
            category_id: productForm.category_id || null,
          })
          .eq("id", editingProduct.id);

        if (error) throw error;
      } else {
        // Create new product
        const { error } = await authSupabase
          .from("products")
          .insert({
            name: productForm.name,
            sku: productForm.sku,
            price: parseFloat(productForm.price),
            category_id: productForm.category_id || null,
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setShowProductDialog(false);
      resetProductForm();
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Gagal menyimpan produk. Silakan coba lagi.");
    }
  };

  const saveMaterial = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      if (editingMaterial) {
        // Update existing material
        const { error } = await authSupabase
          .from("materials")
          .update({
            name: materialForm.name,
            sku: materialForm.sku,
            unit: materialForm.unit,
            unit_price: parseFloat(materialForm.unit_price),
            current_stock: parseFloat(materialForm.current_stock),
            min_stock: parseFloat(materialForm.min_stock),
            type: materialForm.type,
          })
          .eq("id", editingMaterial.id);

        if (error) throw error;
      } else {
        // Create new material
        const { error } = await authSupabase
          .from("materials")
          .insert({
            name: materialForm.name,
            sku: materialForm.sku,
            unit: materialForm.unit,
            unit_price: parseFloat(materialForm.unit_price),
            current_stock: parseFloat(materialForm.current_stock),
            min_stock: parseFloat(materialForm.min_stock),
            type: materialForm.type,
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setShowMaterialDialog(false);
      resetMaterialForm();
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error saving material:", error);
      alert("Gagal menyimpan bahan. Silakan coba lagi.");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;

    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Gagal menghapus produk. Silakan coba lagi.");
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus bahan ini?")) return;

    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Gagal menghapus bahan. Silakan coba lagi.");
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      category_id: product.category_id || "",
    });
    setShowProductDialog(true);
  };

  const editMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      sku: material.sku,
      unit: material.unit,
      unit_price: material.unit_price.toString(),
      current_stock: material.current_stock.toString(),
      min_stock: material.min_stock?.toString() || "",
      type: material.type || "Bahan",
    });
    setShowMaterialDialog(true);
  };

  const getLowStockMaterials = () => {
    return materials.filter(m => m.current_stock <= m.min_stock);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Akses Diperlukan</h1>
          <p className="text-muted-foreground mb-6">
            Silakan masuk untuk mengelola produk dan bahan baku
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Produk & Bahan</h1>
          <p className="text-muted-foreground">
            Kelola produk jadi dan bahan baku untuk bisnis Anda
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {getLowStockMaterials().length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              Peringatan Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {getLowStockMaterials().map((material) => (
                <div key={material.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="font-medium">{material.name}</span>
                  <Badge variant="destructive">
                    {material.current_stock} {material.unit}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Produk Jadi</TabsTrigger>
          <TabsTrigger value="materials">Bahan Baku</TabsTrigger>
          <TabsTrigger value="variations">Variasi Produk</TabsTrigger>
          <TabsTrigger value="kpi">Analisis & KPI</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Daftar Produk</h2>
            <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetProductForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Produk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct
                      ? "Update informasi produk yang sudah ada"
                      : "Tambah produk baru ke katalog Anda"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Nama Produk</Label>
                    <Input
                      id="name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Harga Jual (Rp)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>
                  <SearchableSelect
                    label="Kategori"
                    placeholder="Pilih kategori"
                    options={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                      description: category.description
                    }))}
                    value={productForm.category_id}
                    onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                    className="mb-4"
                    dropdownWidth="min-w-[300px] max-w-[400px]"
                    triggerMaxWidth="max-w-[300px]"
                  />
                  <Button onClick={saveProduct} className="w-full">
                    {editingProduct ? "Update Produk" : "Simpan Produk"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Produk Terdaftar</CardTitle>
              <CardDescription>
                Daftar semua produk jadi yang tersedia di bisnis Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>BOM</TableHead>
                    <TableHead>KPI & Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variasi</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-center">
                          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Belum ada produk</p>
                          <Button className="mt-2" onClick={() => setShowProductDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Produk Pertama
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="max-w-xs break-words whitespace-normal leading-normal">
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>Rp {product.price?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          {categories.find(c => c.id === product.category_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {product.bom_count && product.bom_count > 0 ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">
                                <Layers className="h-3 w-3 mr-1" />
                                {product.bom_count} item
                              </Badge>
                              {product.total_bom_cost > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  <div>Total Modal: Rp {product.total_bom_cost.toLocaleString("id-ID")}</div>
                                  {product.base_bom_cost > 0 && (
                                    <div className="text-xs">Base: Rp {product.base_bom_cost.toLocaleString("id-ID")}</div>
                                  )}
                                  {product.variation_bom_cost > 0 && (
                                    <div className="text-xs">Variasi: Rp {product.variation_bom_cost.toLocaleString("id-ID")}</div>
                                  )}
                                </div>
                              )}
                              {product.variations && product.variations.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="text-xs text-blue-600">
                                    {product.variations.length} variasi
                                    {product.variation_details && product.variation_details.length > 0 && (
                                      <div className="text-xs">{product.variation_details.length} dengan BOM khusus</div>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => showVariationDetails(product)}
                                    title="Detail Variasi"
                                  >
                                    <Info className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.total_bom_cost > 0 && product.price > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <div className="text-sm font-medium">
                                  {((product.price - product.total_bom_cost) / product.price * 100).toFixed(1)}%
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => showAIAnalysis(product)}
                                  title="Analisis AI & KPI"
                                >
                                  <BarChart3 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ROAS min: {(product.price / (product.price - product.total_bom_cost)).toFixed(1)}x
                              </div>
                              <div className="text-xs text-green-600">
                                Laba: Rp {(product.price - product.total_bom_cost).toLocaleString("id-ID")}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-sm">-</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => showAIAnalysis(product)}
                                title="Setup KPI"
                              >
                                <Calculator className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Aktif" : "Non-aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProductForVariations(product);
                              setActiveTab("variations");
                            }}
                          >
                            <Palette className="h-4 w-4 mr-1" />
                            Kelola
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bahan Baku</h2>
            <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetMaterialForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Bahan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingMaterial ? "Edit Bahan" : "Tambah Bahan Baru"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingMaterial
                      ? "Update informasi bahan baku"
                      : "Tambah bahan baku baru ke inventory"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="material_name">Nama Bahan</Label>
                    <Input
                      id="material_name"
                      value={materialForm.name}
                      onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="material_sku">SKU</Label>
                      {!editingMaterial && (
                        <Badge variant="secondary" className="text-xs">
                          Otomatis
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="material_sku"
                      value={materialForm.sku}
                      onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })}
                      readOnly={!editingMaterial}
                      placeholder="PRD0001"
                      className={!editingMaterial ? "bg-muted" : ""}
                    />
                    {!editingMaterial && (
                      <p className="text-xs text-muted-foreground mt-1">
                        SKU dihasilkan otomatis. Klik edit untuk mengubah SKU.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="unit">Satuan</Label>
                    <Input
                      id="unit"
                      value={materialForm.unit}
                      onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                      placeholder="pcs, meter, gram, etc"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_price">Harga per Satuan (Rp)</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      value={materialForm.unit_price}
                      onChange={(e) => setMaterialForm({ ...materialForm, unit_price: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="current_stock">Stok Saat Ini</Label>
                      <Input
                        id="current_stock"
                        type="number"
                        value={materialForm.current_stock}
                        onChange={(e) => setMaterialForm({ ...materialForm, current_stock: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_stock">Stok Minimum</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        value={materialForm.min_stock}
                        onChange={(e) => setMaterialForm({ ...materialForm, min_stock: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipe</Label>
                      <Select value={materialForm.type} onValueChange={(value) => setMaterialForm({ ...materialForm, type: value as "Jasa" | "Bahan" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bahan">Bahan</SelectItem>
                          <SelectItem value="Jasa">Jasa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={saveMaterial} className="w-full">
                    {editingMaterial ? "Update Bahan" : "Simpan Bahan"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Bahan Baku</CardTitle>
              <CardDescription>
                Daftar semua bahan baku dengan stok dan harga per satuan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga/Satuan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-center">
                          <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Belum ada bahan baku</p>
                          <Button className="mt-2" onClick={() => setShowMaterialDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Bahan Pertama
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">
                          <div className="max-w-xs break-words whitespace-normal leading-normal">
                            {material.name}
                          </div>
                        </TableCell>
                        <TableCell>{material.sku}</TableCell>
                        <TableCell>
                          <Badge variant={material.current_stock <= material.min_stock ? "destructive" : "default"}>
                            {material.current_stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell>Rp {material.unit_price?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          {material.current_stock <= material.min_stock ? (
                            <Badge variant="destructive">Stok Menipis</Badge>
                          ) : (
                            <Badge variant="default">Cukup</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editMaterial(material)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMaterial(material.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Manajemen Variasi Produk
              </CardTitle>
              <CardDescription>
                Kelola variasi produk seperti warna, ukuran, motif, dan lainnya
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProductForVariations ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Variasi untuk: {selectedProductForVariations.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        SKU: {selectedProductForVariations.sku}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProductForVariations(null)}
                    >
                      Kembali ke Daftar
                    </Button>
                  </div>
                  <VariationManager
                    productId={selectedProductForVariations.id}
                    productName={selectedProductForVariations.name}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Pilih produk untuk mengelola variasinya
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.slice(0, 6).map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedProductForVariations(product)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="font-medium line-clamp-2">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {product.sku}
                            </div>
                            <div className="text-sm font-medium">
                              Rp {product.price.toLocaleString("id-ID")}
                            </div>
                            <Badge
                              variant={product.is_active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {product.is_active ? "Aktif" : "Non-aktif"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {products.length > 6 && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Dan {products.length - 6} produk lainnya. Pilih produk dari tabel untuk mengelola variasi.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">Produk aktif</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products.length > 0 ?
                    (products.reduce((sum, p) => sum + ((p.price - (p.total_bom_cost || 0)) / p.price * 100), 0) / products.length).toFixed(1) + '%'
                    : '0%'
                  }
                </div>
                <p className="text-xs text-muted-foreground">Rata-rata margin</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Margin Products</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.total_bom_cost > 0 && ((p.price - p.total_bom_cost) / p.price * 100) >= 30).length}
                </div>
                <p className="text-xs text-muted-foreground">Margin ≥ 30%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs BOM Setup</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {products.filter(p => !p.bom_count || p.bom_count === 0).length}
                </div>
                <p className="text-xs text-muted-foreground">Belum setup BOM</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Recommendations & Action Plan
              </CardTitle>
              <CardDescription>
                Rekomendasi AI untuk mengoptimalkan pricing, advertising, dan strategi penjualan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productKPIs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4" />
                    <p>Loading AI recommendations...</p>
                  </div>
                ) : (
                  <>
                    {/* High Priority Recommendations */}
                    {productKPIs.some(kpi => kpi.ai_recommendations?.some(rec => rec.priority === 'high')) && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-3">High Priority Actions</h4>
                        <div className="space-y-3">
                          {productKPIs.map(kpi =>
                            kpi.ai_recommendations
                              ?.filter(rec => rec.priority === 'high')
                              .map((rec, index) => (
                                <div key={`${kpi.product_id}_${index}`} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-medium text-red-800">{rec.title}</h5>
                                      <p className="text-sm text-red-600">{rec.description}</p>
                                    </div>
                                    <Badge variant="destructive" className="text-xs">
                                      {rec.type.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-red-700 mb-2">
                                    <strong>Expected Impact:</strong> {rec.expected_impact}
                                  </div>
                                  <div className="text-xs text-red-600">
                                    <strong>Action Items:</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {rec.action_items.map((item, itemIndex) => (
                                        <li key={itemIndex}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="text-xs text-red-500 mt-2">
                                    <strong>Difficulty:</strong> {rec.implementation_difficulty}
                                  </div>
                                </div>
                              ))
                          ).filter(Boolean)}
                        </div>
                      </div>
                    )}

                    {/* Medium Priority Recommendations */}
                    {productKPIs.some(kpi => kpi.ai_recommendations?.some(rec => rec.priority === 'medium')) && (
                      <div>
                        <h4 className="font-medium text-yellow-600 mb-3">Medium Priority Actions</h4>
                        <div className="space-y-3">
                          {productKPIs.map(kpi =>
                            kpi.ai_recommendations
                              ?.filter(rec => rec.priority === 'medium')
                              .map((rec, index) => (
                                <div key={`${kpi.product_id}_${index}`} className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-medium text-yellow-800">{rec.title}</h5>
                                      <p className="text-sm text-yellow-600">{rec.description}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                                      {rec.type.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-yellow-700 mb-2">
                                    <strong>Expected Impact:</strong> {rec.expected_impact}
                                  </div>
                                  <div className="text-xs text-yellow-600">
                                    <strong>Action Items:</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {rec.action_items.map((item, itemIndex) => (
                                        <li key={itemIndex}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="text-xs text-yellow-500 mt-2">
                                    <strong>Difficulty:</strong> {rec.implementation_difficulty}
                                  </div>
                                </div>
                              ))
                          ).filter(Boolean)}
                        </div>
                      </div>
                    )}

                    {/* Product-wise KPI Table */}
                    <div>
                      <h4 className="font-medium mb-3">Product Performance & KPIs</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>HPP</TableHead>
                              <TableHead>Harga Jual</TableHead>
                              <TableHead>Margin</TableHead>
                              <TableHead>Min ROAS</TableHead>
                              <TableHead>Rec ROAS</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productKPIs.map(kpi => {
                              const product = products.find(p => p.id === kpi.product_id);
                              return (
                                <TableRow key={kpi.product_id}>
                                  <TableCell className="font-medium">
                                    <div className="max-w-xs break-words">{product?.name || 'Unknown'}</div>
                                  </TableCell>
                                  <TableCell>Rp {kpi.hpp.toLocaleString("id-ID")}</TableCell>
                                  <TableCell>Rp {kpi.selling_price.toLocaleString("id-ID")}</TableCell>
                                  <TableCell>
                                    <div className={`font-medium ${
                                      kpi.profit_margin >= 30 ? 'text-green-600' :
                                      kpi.profit_margin >= 20 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {kpi.profit_margin.toFixed(1)}%
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium text-red-600">
                                      {kpi.minimal_roas.toFixed(1)}x
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium text-green-600">
                                      {kpi.recommended_roas.toFixed(1)}x
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {kpi.profit_margin >= 30 ? (
                                      <Badge className="bg-green-100 text-green-800">Scale Ready</Badge>
                                    ) : kpi.profit_margin >= 20 ? (
                                      <Badge className="bg-yellow-100 text-yellow-800">Test & Learn</Badge>
                                    ) : (
                                      <Badge variant="destructive">Needs Fix</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const product = products.find(p => p.id === kpi.product_id);
                                        if (product) showAIAnalysis(product);
                                      }}
                                    >
                                      <Zap className="h-3 w-3 mr-1" />
                                      AI Analysis
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Variation Details Dialog */}
      <Dialog open={showVariationDetailsDialog} onOpenChange={setShowVariationDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detail Variasi dan BOM</DialogTitle>
            <DialogDescription>
              Informasi variasi dan komposisi bahan baku untuk produk
            </DialogDescription>
          </DialogHeader>
          {selectedProductForDetails && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-2">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">{selectedProductForDetails.name}</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <div>SKU: {selectedProductForDetails.sku}</div>
                  <div>Harga Jual: Rp {selectedProductForDetails.price.toLocaleString("id-ID")}</div>
                </div>
              </div>

              {/* BOM Cost Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">Base BOM</div>
                  <div className="text-lg font-bold">
                    Rp {(selectedProductForDetails.base_bom_cost || 0).toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(selectedProductForDetails.bill_of_materials || []).length} item
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-700">Total Variasi BOM</div>
                  <div className="text-lg font-bold">
                    Rp {(selectedProductForDetails.variation_bom_cost || 0).toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-purple-500">
                    {selectedProductForDetails.variations?.length || 0} variasi
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-700">Avg Total Modal</div>
                  <div className="text-lg font-bold">
                    Rp {(selectedProductForDetails.total_bom_cost || 0).toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-blue-500">
                    Rata-rata per variasi
                  </div>
                </div>
              </div>

              {/* Variations List */}
              {selectedProductForDetails.variations && selectedProductForDetails.variations.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-3">Daftar Variasi:</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {selectedProductForDetails.variations.map((variation: any) => {
                      // Calculate HPP for this specific variation
                      const baseBOMCost = selectedProductForDetails.base_bom_cost || 0;
                      const variationDetail = selectedProductForDetails.variation_details?.find((vd: any) => vd.variation_name === variation.name);
                      const variationBOMCost = variationDetail?.total_cost || 0;
                      const totalHPP = baseBOMCost + variationBOMCost;
                      const profit = variation.final_price - totalHPP;
                      const margin = variation.final_price > 0 ? (profit / variation.final_price) * 100 : 0;

                      return (
                        <div key={variation.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{variation.name}</div>
                            <div className="text-sm font-bold text-green-600">
                              Rp {variation.final_price.toLocaleString("id-ID")}
                            </div>
                          </div>
                          {variation.option_names && variation.option_names.length > 0 && (
                            <div className="text-sm text-muted-foreground mb-2">
                              Opsi: {variation.option_names.join(", ")}
                            </div>
                          )}
                          {variation.stock_quantity !== undefined && (
                            <div className="text-xs text-muted-foreground mb-2">
                              Stok: {variation.stock_quantity}
                            </div>
                          )}

                          {/* Cost breakdown for this variation */}
                          <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-600">Base BOM</div>
                              <div className="font-medium">Rp {baseBOMCost.toLocaleString("id-ID")}</div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded">
                              <div className="text-purple-600">Variasi BOM</div>
                              <div className="font-medium">Rp {variationBOMCost.toLocaleString("id-ID")}</div>
                            </div>
                            <div className={`p-2 rounded ${margin >= 20 ? 'bg-green-50' : margin >= 10 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                              <div className={margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                                {margin >= 20 ? 'Profit' : margin >= 10 ? 'Low Profit' : 'Loss'}
                              </div>
                              <div className={`font-medium ${margin >= 20 ? 'text-green-700' : margin >= 10 ? 'text-yellow-700' : 'text-red-700'}`}>
                                {margin.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* Total HPP and Profit */}
                          <div className="flex justify-between items-center text-xs bg-blue-50 p-2 rounded mb-2">
                            <div>
                              <div className="text-blue-600">Total HPP</div>
                              <div className="font-bold text-blue-700">Rp {totalHPP.toLocaleString("id-ID")}</div>
                            </div>
                            <div className="text-right">
                              <div className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {profit >= 0 ? 'Laba' : 'Rugi'}
                              </div>
                              <div className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                Rp {profit.toLocaleString("id-ID")}
                              </div>
                            </div>
                          </div>

                          {/* Variation-specific BOM items */}
                          {variationDetail && variationDetail.bom_count > 0 && (
                            <div className="text-xs bg-purple-25 p-2 rounded border border-purple-200">
                              <div className="font-medium text-purple-700 mb-1">BOM Khusus Variasi:</div>
                              <div className="text-purple-600">
                                {variationDetail.bom_count} item dengan total biaya Rp {variationBOMCost.toLocaleString("id-ID")}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Belum ada variasi untuk produk ini
                </div>
              )}

              {/* Base BOM Items */}
              {selectedProductForDetails.bom_items && selectedProductForDetails.bom_items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">BOM Utama (Base):</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedProductForDetails.bom_items.map((bom: any) => (
                      <div key={bom.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <div>{bom.material?.name}</div>
                        <div>{bom.quantity} {bom.material?.unit} × Rp {bom.unit_cost.toLocaleString("id-ID")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={showAIAnalysisDialog} onOpenChange={setShowAIAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Analysis & ROAS Calculator
            </DialogTitle>
            <DialogDescription>
              Analisis komprehensif produk dengan rekomendasi AI untuk optimasi pricing dan advertising
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
            {selectedProductForAI && (() => {
              const kpi = calculateProductKPI(selectedProductForAI);
              return (
                <>
                    {/* Product Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 mb-1">Product</div>
                        <div className="font-bold text-blue-900">{selectedProductForAI.name}</div>
                        <div className="text-sm text-blue-600">SKU: {selectedProductForAI.sku}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm font-medium text-green-800 mb-1">Current Margin</div>
                        <div className="font-bold text-green-900">{kpi.profit_margin.toFixed(1)}%</div>
                        <div className="text-sm text-green-600">
                          Laba: Rp {(kpi.selling_price - kpi.hpp).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-sm font-medium text-purple-800 mb-1">ROAS Targets</div>
                        <div className="font-bold text-purple-900">Min: {kpi.minimal_roas.toFixed(1)}x</div>
                        <div className="text-sm text-purple-600">Recommended: {kpi.recommended_roas.toFixed(1)}x</div>
                      </div>
                    </div>

                    {/* HPP Breakdown */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-800 mb-2">HPP Breakdown</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Total HPP:</div>
                          <div className="font-bold text-lg">Rp {kpi.hpp.toLocaleString("id-ID")}</div>
                          <div className="text-xs text-gray-500 mt-1">{kpi.hpp_breakdown}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Component Details:</div>
                          <div className="text-xs space-y-1">
                            <div>Base BOM: Rp {(selectedProductForAI.base_bom_cost || 0).toLocaleString("id-ID")}</div>
                            <div>Total Variasi BOM: Rp {(selectedProductForAI.variation_bom_cost || 0).toLocaleString("id-ID")}</div>
                            <div>Variasi Count: {selectedProductForAI.variations?.length || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ROAS Calculator */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          ROAS Calculator & Scenario Planning
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Current Scenario */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Current Performance</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Harga Jual:</span>
                                <span className="font-medium">Rp {kpi.selling_price.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>HPP (COGS):</span>
                                <span className="font-medium">Rp {kpi.hpp.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gross Profit:</span>
                                <span className="font-medium text-green-600">Rp {(kpi.selling_price - kpi.hpp).toLocaleString("id-ID")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Minimal ROAS:</span>
                                <span className="font-medium text-red-600">{kpi.minimal_roas.toFixed(1)}x</span>
                              </div>
                            </div>
                          </div>

                          {/* Optimization Scenarios */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Optimization Scenarios</h4>
                            <div className="space-y-3">
                              {/* Price Increase Scenario */}
                              <div className="p-3 border rounded">
                                <div className="font-medium text-sm mb-2">Price Increase (+15%)</div>
                                <div className="text-xs space-y-1">
                                  <div>New Price: Rp ${(kpi.selling_price * 1.15).toLocaleString("id-ID")}</div>
                                  <div>New Margin: {(((kpi.selling_price * 1.15) - kpi.hpp) / (kpi.selling_price * 1.15) * 100).toFixed(1)}%</div>
                                  <div>New Min ROAS: {((kpi.selling_price * 1.15) / ((kpi.selling_price * 1.15) - kpi.hpp)).toFixed(1)}x</div>
                                </div>
                              </div>

                              {/* Cost Reduction Scenario */}
                              <div className="p-3 border rounded">
                                <div className="font-medium text-sm mb-2">Cost Reduction (-10%)</div>
                                <div className="text-xs space-y-1">
                                  <div>New HPP: Rp ${(kpi.hpp * 0.9).toLocaleString("id-ID")}</div>
                                  <div>New Margin: {((kpi.selling_price - (kpi.hpp * 0.9)) / kpi.selling_price * 100).toFixed(1)}%</div>
                                  <div>New Min ROAS: {(kpi.selling_price / (kpi.selling_price - (kpi.hpp * 0.9))).toFixed(1)}x</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Recommendations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5" />
                          AI-Powered Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {kpi.ai_recommendations && kpi.ai_recommendations.length > 0 ? (
                            kpi.ai_recommendations.map((rec, index) => (
                              <div key={index} className={`p-4 border-l-4 rounded-lg ${
                                rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                                rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                'border-blue-500 bg-blue-50'
                              }`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h5 className="font-medium">{rec.title}</h5>
                                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant={
                                      rec.priority === 'high' ? 'destructive' :
                                      rec.priority === 'medium' ? 'outline' : 'default'
                                    }>
                                      {rec.priority}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {rec.type}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <h6 className="text-sm font-medium mb-2">Action Items:</h6>
                                    <ul className="text-sm space-y-1">
                                      {rec.action_items.map((item, itemIndex) => (
                                        <li key={itemIndex} className="flex items-start gap-2">
                                          <span className="text-muted-foreground">•</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h6 className="text-sm font-medium mb-2">Expected Impact:</h6>
                                    <p className="text-sm">{rec.expected_impact}</p>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Difficulty: {rec.implementation_difficulty}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                              <p>No specific recommendations available for this product</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Marketplace & E-commerce Strategy */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Marketplace Strategy & Profit Calculator
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Marketplace Fee Calculator */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-4 bg-orange-50 rounded-lg">
                              <h5 className="font-medium text-orange-800 mb-3">Shopee Fee Structure</h5>
                              <div className="space-y-2 text-sm text-orange-700">
                                <div className="flex justify-between">
                                  <span>Transaction Fee:</span>
                                  <span>5.5% + Rp 1.250</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Payment Gateway:</span>
                                  <span>2-3%</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>Total Fee:</span>
                                  <span>~7.5-8.5%</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-purple-50 rounded-lg">
                              <h5 className="font-medium text-purple-800 mb-3">TikTok Shop Fee Structure</h5>
                              <div className="space-y-2 text-sm text-purple-700">
                                <div className="flex justify-between">
                                  <span>Commission Fee:</span>
                                  <span>5-8%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Payment Processing:</span>
                                  <span>2%</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>Total Fee:</span>
                                  <span>~7-10%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Profit Projections */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(() => {
                              const sellingPrice = kpi.selling_price;
                              const hpp = kpi.hpp;
                              const conversionRate = 0.03; // 3%

                              // Shopee calculations
                              const shopeeFeePercent = 0.075; // 7.5%
                              const shopeeFixedFee = 1250;
                              const shopeeTotalFee = (sellingPrice * shopeeFeePercent) + shopeeFixedFee;
                              const shopeeNetRevenue = sellingPrice - shopeeTotalFee;
                              const shopeeNetProfit = shopeeNetRevenue - hpp;
                              const shopeeNetMargin = shopeeNetRevenue > 0 ? (shopeeNetProfit / shopeeNetRevenue) * 100 : 0;

                              // TikTok calculations
                              const tiktokFeePercent = 0.085; // 8.5%
                              const tiktokNetRevenue = sellingPrice * (1 - tiktokFeePercent);
                              const tiktokNetProfit = tiktokNetRevenue - hpp;
                              const tiktokNetMargin = tiktokNetRevenue > 0 ? (tiktokNetProfit / tiktokNetRevenue) * 100 : 0;

                              return (
                                <>
                                  <div className="p-4 bg-green-50 rounded-lg">
                                    <h5 className="font-medium text-green-800 mb-3">Shopee Profit Analysis</h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Harga Jual:</span>
                                        <span className="font-medium">Rp {sellingPrice.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Fee Shopee:</span>
                                        <span className="text-red-600">-Rp {shopeeTotalFee.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Net Revenue:</span>
                                        <span className="font-medium">Rp {shopeeNetRevenue.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>HPP:</span>
                                        <span className="text-red-600">-Rp {hpp.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-green-700">
                                        <span>Net Profit:</span>
                                        <span>Rp {shopeeNetProfit.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between font-bold">
                                        <span>Net Margin:</span>
                                        <span className={shopeeNetMargin >= 15 ? 'text-green-600' : shopeeNetMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                                          {shopeeNetMargin.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-4 bg-blue-50 rounded-lg">
                                    <h5 className="font-medium text-blue-800 mb-3">TikTok Shop Profit Analysis</h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Harga Jual:</span>
                                        <span className="font-medium">Rp {sellingPrice.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Fee TikTok:</span>
                                        <span className="text-red-600">-Rp {(sellingPrice * tiktokFeePercent).toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Net Revenue:</span>
                                        <span className="font-medium">Rp {tiktokNetRevenue.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>HPP:</span>
                                        <span className="text-red-600">-Rp {hpp.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-green-700">
                                        <span>Net Profit:</span>
                                        <span>Rp {tiktokNetProfit.toLocaleString("id-ID")}</span>
                                      </div>
                                      <div className="flex justify-between font-bold">
                                        <span>Net Margin:</span>
                                        <span className={tiktokNetMargin >= 15 ? 'text-green-600' : tiktokNetMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                                          {tiktokNetMargin.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* AI Recommendations for Marketplaces */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded">
                              <h5 className="font-medium text-orange-800 mb-2">Shopee Strategy</h5>
                              <div className="text-sm text-orange-700 space-y-2">
                                <div><strong>Target ROAS:</strong> {Math.max(kpi.minimal_roas * 1.2, 3).toFixed(1)}x</div>
                                <div><strong>Focus:</strong> Free Shipping Campaign, Flash Sale</div>
                                <div><strong>Budget:</strong> 8-12% dari revenue</div>
                                <div><strong>Ads Type:</strong> Search Ads, Discovery Ads</div>
                                <div className="text-xs mt-2">
                                  <strong>Conversion Rate 3% Projection:</strong><br/>
                                  Dengan 1000 klik → 30 order → Rp {(kpi.selling_price * 30).toLocaleString("id-ID")} revenue
                                </div>
                              </div>
                            </div>

                            <div className="p-4 border-l-4 border-purple-500 bg-purple-50 rounded">
                              <h5 className="font-medium text-purple-800 mb-2">TikTok Strategy</h5>
                              <div className="text-sm text-purple-700 space-y-2">
                                <div><strong>Target ROAS:</strong> {Math.max(kpi.minimal_roas * 1.1, 2.5).toFixed(1)}x</div>
                                <div><strong>Focus:</strong> Video Content, Livestream</div>
                                <div><strong>Budget:</strong> 10-15% dari revenue</div>
                                <div><strong>Ads Type:</strong> In-Feed Ads, TopView</div>
                                <div className="text-xs mt-2">
                                  <strong>Conversion Rate 3% Projection:</strong><br/>
                                  Dengan 1000 klik → 30 order → Rp {(kpi.selling_price * 30).toLocaleString("id-ID")} revenue
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Platform Comparison */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h5 className="font-medium text-gray-800 mb-3">Platform Recommendation</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {(() => {
                                const shopeeMargin = ((kpi.selling_price - (kpi.selling_price * 0.075) - 1250 - kpi.hpp) / (kpi.selling_price - (kpi.selling_price * 0.075) - 1250)) * 100;
                                const tiktokMargin = ((kpi.selling_price - (kpi.selling_price * 0.085) - kpi.hpp) / (kpi.selling_price - (kpi.selling_price * 0.085))) * 100;

                                if (shopeeMargin > 15 && tiktokMargin > 15) {
                                  return (
                                    <>
                                      <div className="text-center">
                                        <div className="font-bold text-green-600 mb-1">Best: Shopee</div>
                                        <div className="text-xs">Fee lebih terprediksi</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-blue-600 mb-1">Alternative: TikTok</div>
                                        <div className="text-xs">Viral potential tinggi</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-purple-600 mb-1">Strategy</div>
                                        <div className="text-xs">Multi-platform</div>
                                      </div>
                                    </>
                                  );
                                } else if (shopeeMargin > 10) {
                                  return (
                                    <>
                                      <div className="text-center">
                                        <div className="font-bold text-green-600 mb-1">Recommended</div>
                                        <div className="text-xs">Shopee Only</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-yellow-600 mb-1">Not Ready</div>
                                        <div className="text-xs">TikTok Shop</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-orange-600 mb-1">Focus</div>
                                        <div className="text-xs">Optimize HPP dulu</div>
                                      </div>
                                    </>
                                  );
                                } else {
                                  return (
                                    <>
                                      <div className="text-center">
                                        <div className="font-bold text-red-600 mb-1">Not Ready</div>
                                        <div className="text-xs">Marketplace</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-red-600 mb-1">Action Needed</div>
                                        <div className="text-xs">Optimize Pricing</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-orange-600 mb-1">Priority</div>
                                        <div className="text-xs">Reduce HPP</div>
                                      </div>
                                    </>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}