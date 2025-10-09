"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Calculator,
  AlertCircle,
  TrendingUp,
  Info,
  Settings,
  FileText,
  Copy,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";
import type {
  Product,
  Material,
  BOMItem,
  ProductWithBOM,
  ProductVariation,
  BOMVariation,
  ProductVariationWithDetails
} from "@/types/variations";

interface BOMWithVariations extends BOMItem {
  product_variations?: ProductVariationWithDetails[];
  bom_variations?: BOMVariation[];
}

interface ProductVariationWithBOM extends ProductWithBOM {
  variation_id?: string;
  variation_name?: string;
  variation_options?: string[];
  base_bom_cost?: number;
  variation_bom_cost?: number;
  stock_quantity?: number;
  is_variation?: boolean;
  parent_product_id?: string;
}

export default function BOMPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [productsWithBOM, setProductsWithBOM] = useState<ProductVariationWithBOM[]>([]);
  const [productsForDropdown, setProductsForDropdown] = useState<Product[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariationWithDetails[]>([]);
  const [bomVariations, setBomVariations] = useState<BOMVariation[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<{
    product_id: string;
    variation_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBOMDialog, setShowBOMDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [bomToDuplicate, setBomToDuplicate] = useState<BOMItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingVariation, setSavingVariation] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateForm, setDuplicateForm] = useState({
    target_product_id: "",
    copy_quantity: true,
    copy_unit_cost: true,
  });

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  // Form states
  const [bomForm, setBomForm] = useState({
    product_id: "",
    material_id: "",
    quantity: "",
    unit_cost: "",
    notes: "",
  });

  // Track if unit cost has been manually edited
  const [unitCostManuallyEdited, setUnitCostManuallyEdited] = useState(false);

  // Track validation state for duplicate dialog
  const [duplicateValidation, setDuplicateValidation] = useState({
    isValid: true,
    message: ""
  });

  // BOM Variation states
  const [showBOMVariationDialog, setShowBOMVariationDialog] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariationWithDetails | null>(null);
  const [editingBOMVariation, setEditingBOMVariation] = useState<BOMVariation | null>(null);
  const [bomVariationForm, setBomVariationForm] = useState({
    material_id: "",
    quantity: "",
    unit_cost: "",
    notes: "",
  });
  const [bomVariationUnitCostManuallyEdited, setBomVariationUnitCostManuallyEdited] = useState(false);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user]);

  // Auto-fill unit cost when material is selected
  useEffect(() => {
    if (bomForm.material_id && materials.length > 0) {
      const selectedMaterial = materials.find(material => material.id === bomForm.material_id);
      if (selectedMaterial) {
        // Only auto-fill if unit cost hasn't been manually edited or if it's empty
        if (!unitCostManuallyEdited || !bomForm.unit_cost) {
          setBomForm(prev => ({
            ...prev,
            unit_cost: selectedMaterial.unit_price.toString()
          }));
        }
      }
    } else if (!bomForm.material_id) {
      // Clear unit cost and reset manual edit flag if no material is selected
      setBomForm(prev => ({
        ...prev,
        unit_cost: ""
      }));
      setUnitCostManuallyEdited(false);
    }
  }, [bomForm.material_id, materials, unitCostManuallyEdited, bomForm.unit_cost]);

  // Auto-fill unit cost when material is selected for BOM variations
  useEffect(() => {
    if (bomVariationForm.material_id && materials.length > 0) {
      const selectedMaterial = materials.find(material => material.id === bomVariationForm.material_id);
      if (selectedMaterial) {
        // Only auto-fill if unit cost hasn't been manually edited or if it's empty
        if (!bomVariationUnitCostManuallyEdited || !bomVariationForm.unit_cost) {
          setBomVariationForm(prev => ({
            ...prev,
            unit_cost: selectedMaterial.unit_price.toString()
          }));
        }
      }
    } else if (!bomVariationForm.material_id) {
      // Clear unit cost and reset manual edit flag if no material is selected
      setBomVariationForm(prev => ({
        ...prev,
        unit_cost: ""
      }));
      setBomVariationUnitCostManuallyEdited(false);
    }
  }, [bomVariationForm.material_id, materials, bomVariationUnitCostManuallyEdited, bomVariationForm.unit_cost]);

  // Real-time validation for duplicate BOM
  useEffect(() => {
    const validateDuplicate = async () => {
      if (!bomToDuplicate || !duplicateForm.target_product_id) {
        setDuplicateValidation({ isValid: true, message: "" });
        return;
      }

      try {
        const token = await getToken();
        const authSupabase = createSupabaseClientWithAuth(token);

        const { data: existingBOM } = await authSupabase
          .from("bill_of_materials")
          .select("*")
          .eq("product_id", duplicateForm.target_product_id)
          .eq("material_id", bomToDuplicate.material_id)
          .eq("user_id", user?.id)
          .single();

        if (existingBOM) {
          setDuplicateValidation({
            isValid: false,
            message: "BOM untuk bahan baku ini sudah ada di produk tujuan."
          });
        } else {
          setDuplicateValidation({ isValid: true, message: "" });
        }
      } catch (error) {
        // If no BOM found, it's valid
        setDuplicateValidation({ isValid: true, message: "" });
      }
    };

    validateDuplicate();
  }, [duplicateForm.target_product_id, bomToDuplicate, user?.id, getToken]);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Fetch products
      const { data: productsData } = await authSupabase
        .from("products")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("name");

      // Fetch materials
      const { data: materialsData } = await authSupabase
        .from("materials")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("name");

      // Fetch product variations
      const { data: variationsData } = await authSupabase
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
        .order("name");

      // Fetch BOM items with relationships
      const { data: bomData } = await authSupabase
        .from("bill_of_materials")
        .select(`
          *,
          product:products (
            id,
            name,
            sku,
            price,
            cost_price
          ),
          material:materials (
            id,
            name,
            unit,
            unit_price,
            current_stock,
            min_stock
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      // Fetch BOM variations
      const { data: bomVariationsData } = await authSupabase
        .from("bom_variations")
        .select(`
          *,
          product_variation:product_variations (
            id,
            name,
            product_id,
            price_adjustment,
            final_price,
            stock_quantity
          ),
          material:materials (
            id,
            name,
            unit,
            unit_price,
            current_stock,
            min_stock,
            is_active
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);
      setMaterials(materialsData || []);
      setBomItems(bomData || []);

      // Process variations data
      let variationsWithDetails: any[] = [];
      if (variationsData) {
        variationsWithDetails = variationsData.map(variation => {
          const combinations = variation.variation_combinations || [];
          const optionNames = combinations
            .map(c => c.variation_options?.name)
            .filter(Boolean) as string[];

          const variationBOMs = bomVariationsData?.filter(bom => bom.product_variation_id === variation.id) || [];
          const totalBomCost = variationBOMs.reduce((sum, bom) => sum + Number(bom.total_cost), 0);

          return {
            ...variation,
            option_names: optionNames,
            total_bom_cost: totalBomCost,
            combinations: combinations
          };
        });
        setProductVariations(variationsWithDetails);
      }

      setBomVariations(bomVariationsData || []);

      // Calculate product BOM summaries
      const productBOMMap = new Map<string, ProductWithBOM>();

      // Initialize products in map
      productsData?.forEach(product => {
        productBOMMap.set(product.id, {
          ...product,
          bom_items: [],
          total_material_cost: 0,
          profit_margin: 0
        });
      });

      // Add BOM items to products
      bomData?.forEach(bom => {
        if (bom.product && bom.material && productBOMMap.has(bom.product_id)) {
          const product = productBOMMap.get(bom.product_id)!;
          product.bom_items.push(bom);
        }
      });

      // Create variation-based product list
      const variationProducts: ProductVariationWithBOM[] = [];

      productBOMMap.forEach(product => {
        const productVariations = variationsWithDetails.filter(v => v.product_id === product.id);
        const baseBOMCost = product.bom_items.reduce((sum, item) => sum + item.total_cost, 0);

        if (productVariations.length === 0) {
          // Product without variations - use original calculation
          product.total_material_cost = baseBOMCost;
          product.profit_margin = product.price > 0 ? ((product.price - product.total_material_cost) / product.price) * 100 : 0;
          (product as any).variations = [];
          (product as any).base_bom_cost = baseBOMCost;
          (product as any).variation_bom_cost = 0;
          variationProducts.push(product);
        } else {
          // Create separate entries for each variation
          productVariations.forEach(variation => {
            const variationBOMs = bomVariationsData?.filter(bom => bom.product_variation_id === variation.id) || [];
            const variationBOMCost = variationBOMs.reduce((sum, bom) => sum + Number(bom.total_cost), 0);

            // Total biaya = base BOM + variation-specific BOM
            const totalMaterialCost = baseBOMCost + variationBOMCost;
            const profitMargin = variation.final_price > 0 ?
              ((variation.final_price - totalMaterialCost) / variation.final_price) * 100 : 0;

            const variationProduct: ProductVariationWithBOM = {
              ...product,
              id: `${product.id}_${variation.id}`, // Unique ID for variation
              name: `${product.name} - ${variation.name}`,
              price: variation.final_price,
              total_material_cost: totalMaterialCost,
              profit_margin: profitMargin,
              bom_items: [
                ...product.bom_items,
                ...variationBOMs.map(bom => ({
                  ...bom,
                  id: bom.id,
                  product_id: product.id,
                  material_id: bom.material_id,
                  quantity: bom.quantity,
                  unit_cost: Number(bom.unit_cost),
                  total_cost: Number(bom.total_cost),
                  material: bom.material,
                  product: bom.product,
                  notes: bom.notes,
                  created_at: bom.created_at,
                  updated_at: bom.updated_at,
                  user_id: bom.user_id,
                  is_active: bom.is_active
                }))
              ],
              // Add variation metadata
              variation_id: variation.id,
              variation_name: variation.name,
              variation_options: variation.option_names,
              base_bom_cost: baseBOMCost,
              variation_bom_cost: variationBOMCost,
              stock_quantity: variation.stock_quantity,
              is_variation: true,
              parent_product_id: product.id
            };

            variationProducts.push(variationProduct);
          });
        }
      });

      setProductsWithBOM(variationProducts);

      // Prepare dropdown options including variations
      const dropdownOptions: Product[] = [];

      productsData?.forEach(product => {
        const productVariations = variationsWithDetails.filter(v => v.product_id === product.id);

        if (productVariations.length === 0) {
          // Product without variations
          dropdownOptions.push(product);
        } else {
          // Product with variations - add parent product
          dropdownOptions.push({
            ...product,
            name: product.name,
            id: product.id
          });

          // Add each variation as separate option
          productVariations.forEach(variation => {
            dropdownOptions.push({
              ...product,
              id: `variation_${variation.id}`,
              name: `${product.name} - ${variation.name}`,
              price: variation.final_price,
              variation_id: variation.id,
              variation_name: variation.name,
              variation_options: variation.option_names,
              parent_product_id: product.id
            });
          });
        }
      });

      setProductsForDropdown(dropdownOptions);

    } catch (error) {
      console.error("Error fetching BOM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBOM = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Check if it's a variation
      if (bomForm.product_id.startsWith('variation_')) {
        if (!selectedProductForVariation) {
          alert('Silakan pilih variasi yang valid');
          setSaving(false);
          return;
        }

        // Save to bom_variations table
        const { error } = await authSupabase
          .from("bom_variations")
          .insert({
            product_variation_id: selectedProductForVariation.variation_id,
            material_id: bomForm.material_id,
            quantity: parseFloat(bomForm.quantity),
            unit_cost: parseFloat(bomForm.unit_cost),
            total_cost: parseFloat(bomForm.quantity) * parseFloat(bomForm.unit_cost),
            notes: bomForm.notes || null,
            user_id: user?.id,
          });

        if (error) throw error;
      } else {
        // Save to regular bill_of_materials table
        const { error } = await authSupabase
          .from("bill_of_materials")
          .insert({
            product_id: bomForm.product_id,
            material_id: bomForm.material_id,
            quantity: parseFloat(bomForm.quantity),
            unit_cost: parseFloat(bomForm.unit_cost),
            notes: bomForm.notes || null,
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setShowBOMDialog(false);
      resetBOMForm();
      setSelectedProductForVariation(null);
      fetchData();
    } catch (error) {
      console.error("Error saving BOM:", error);
      alert("Gagal menyimpan BOM");
    } finally {
      setSaving(false);
    }
  };

  const deleteBOM = async (bomId: string, isVariationBOM = false) => {
    const bom = isVariationBOM
      ? bomVariations.find(b => b.id === bomId)
      : bomItems.find(b => b.id === bomId);

    if (!bom) return;

    const materialName = bom.material?.name || "bahan baku ini";
    if (!confirm(`Apakah Anda yakin ingin menghapus item BOM untuk ${materialName}?`)) return;

    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      if (isVariationBOM) {
        const { error } = await authSupabase
          .from("bom_variations")
          .delete()
          .eq("id", bomId);

        if (error) throw error;
      } else {
        const { error } = await authSupabase
          .from("bill_of_materials")
          .delete()
          .eq("id", bomId);

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error("Error deleting BOM:", error);
      alert("Gagal menghapus BOM");
    }
  };

  const resetBOMForm = () => {
    setBomForm({
      product_id: "",
      material_id: "",
      quantity: "",
      unit_cost: "",
      notes: "",
    });
    setUnitCostManuallyEdited(false);
    setSelectedProductForVariation(null);
  };

  // BOM Variation functions
  const openBOMVariationDialog = (variation: ProductVariationWithDetails) => {
    setSelectedVariation(variation);
    setEditingBOMVariation(null);
    setBomVariationForm({
      material_id: "",
      quantity: "",
      unit_cost: "",
      notes: "",
    });
    setBomVariationUnitCostManuallyEdited(false);
    setShowBOMVariationDialog(true);
  };

  const editBOMVariation = (bom: BOMVariation) => {
    setEditingBOMVariation(bom);
    // Find the parent variation to maintain context
    const parentVariation = productVariations.find(v => v.id === bom.product_variation_id);
    if (parentVariation) {
      setSelectedVariation(parentVariation);
    }
    setBomVariationForm({
      material_id: bom.material_id,
      quantity: bom.quantity.toString(),
      unit_cost: bom.unit_cost.toString(),
      notes: bom.notes || "",
    });
    setBomVariationUnitCostManuallyEdited(true);
    setShowBOMVariationDialog(true);
  };

  const saveBOMVariation = async () => {
    if (!selectedVariation) return;

    try {
      setSavingVariation(true);
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Get shop_id from the parent product
      const { data: parentProduct } = await authSupabase
        .from("products")
        .select("shop_id")
        .eq("id", selectedVariation.product_id)
        .single();

      if (editingBOMVariation) {
        // Update existing BOM variation
        const { error } = await authSupabase
          .from("bom_variations")
          .update({
            material_id: bomVariationForm.material_id,
            quantity: parseFloat(bomVariationForm.quantity),
            unit_cost: parseFloat(bomVariationForm.unit_cost),
            notes: bomVariationForm.notes || null,
          })
          .eq("id", editingBOMVariation.id);

        if (error) throw error;
      } else {
        // Create new BOM variation
        const { error } = await authSupabase
          .from("bom_variations")
          .insert({
            product_variation_id: selectedVariation.id,
            material_id: bomVariationForm.material_id,
            quantity: parseFloat(bomVariationForm.quantity),
            unit_cost: parseFloat(bomVariationForm.unit_cost),
            notes: bomVariationForm.notes || null,
            shop_id: parentProduct?.shop_id || null,
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setShowBOMVariationDialog(false);
      setSelectedVariation(null);
      setEditingBOMVariation(null);
      fetchData();
    } catch (error) {
      console.error("Error saving BOM variation:", error);
      alert("Gagal menyimpan BOM variasi");
    } finally {
      setSavingVariation(false);
    }
  };

  const deleteBOMVariation = async (bomId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus item BOM variasi ini?")) return;

    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("bom_variations")
        .delete()
        .eq("id", bomId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error deleting BOM variation:", error);
      alert("Gagal menghapus BOM variasi");
    }
  };

  const openDuplicateDialog = (bom: BOMItem) => {
    setBomToDuplicate(bom);
    setDuplicateForm({
      target_product_id: "",
      copy_quantity: true,
      copy_unit_cost: true,
    });
    setShowDuplicateDialog(true);
  };

  const resetDuplicateForm = () => {
    setBomToDuplicate(null);
    setDuplicateForm({
      target_product_id: "",
      copy_quantity: true,
      copy_unit_cost: true,
    });
    setDuplicateValidation({ isValid: true, message: "" });
    setShowDuplicateDialog(false);
  };

  const duplicateBOM = async () => {
    if (!bomToDuplicate || !duplicateForm.target_product_id) {
      alert("Silakan pilih produk tujuan");
      return;
    }

    if (!duplicateValidation.isValid) {
      alert(duplicateValidation.message);
      return;
    }

    try {
      setDuplicating(true);
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Create new BOM item
      const { error } = await authSupabase
        .from("bill_of_materials")
        .insert({
          product_id: duplicateForm.target_product_id,
          material_id: bomToDuplicate.material_id,
          quantity: duplicateForm.copy_quantity ? bomToDuplicate.quantity : 1,
          unit_cost: duplicateForm.copy_unit_cost ? bomToDuplicate.unit_cost : 0,
          notes: bomToDuplicate.notes || null,
          user_id: user?.id,
        });

      if (error) throw error;

      resetDuplicateForm();
      fetchData();

      // Show success message
      alert("BOM berhasil diduplikasi ke produk tujuan!");
    } catch (error) {
      console.error("Error duplicating BOM:", error);
      alert("Gagal menduplikasi BOM. Silakan coba lagi.");
    } finally {
      setDuplicating(false);
    }
  };

  const getLowStockMaterials = () => {
    return materials.filter(m => m.current_stock <= m.min_stock);
  };

  const getProductsByProfitMargin = () => {
    return productsWithBOM
      .filter(p => p.bom_items.length > 0)
      .sort((a, b) => b.profit_margin - a.profit_margin);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Akses Diperlukan</h1>
          <p className="text-muted-foreground mb-6">
            Silakan masuk untuk mengakses halaman Bill of Materials
          </p>
        </div>
      </div>
    );
  }

  const lowStockMaterials = getLowStockMaterials();
  const productsByProfit = getProductsByProfitMargin();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Bill of Materials (BOM)
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola komposisi bahan baku untuk setiap produk
          </p>
        </div>
        <Dialog open={showBOMDialog} onOpenChange={setShowBOMDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetBOMForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah BOM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Item BOM</DialogTitle>
              <DialogDescription>Tambahkan bahan baku ke komposisi produk</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <SearchableSelect
                label="Produk"
                placeholder="Pilih produk atau variasi"
                options={productsForDropdown.map((product) => ({
                  value: product.id,
                  label: product.name,
                  description: product.variation_id
                    ? `Variasi: ${product.variation_name || ''} | Rp ${product.price.toLocaleString("id-ID")}`
                    : `SKU: ${product.sku} | Rp ${product.price.toLocaleString("id-ID")}`
                }))}
                value={bomForm.product_id}
                onValueChange={(value) => {
                  setBomForm({ ...bomForm, product_id: value });
                  // If variation is selected, store variation info for later use
                  const selected = productsForDropdown.find(p => p.id === value);
                  if (selected && selected.variation_id) {
                    setSelectedProductForVariation({
                      product_id: selected.parent_product_id || selected.id,
                      variation_id: selected.variation_id
                    });
                  }
                }}
                className="mb-4"
                dropdownWidth="min-w-[600px] max-w-[800px]"
                triggerMaxWidth="max-w-[500px]"
              />
              <SearchableSelect
                label="Bahan Baku"
                placeholder="Pilih bahan baku"
                options={materials.map((material) => ({
                  value: material.id,
                  label: material.name,
                  description: `${material.unit} | Rp ${material.unit_price.toLocaleString("id-ID")} | Stok: ${material.current_stock}`
                }))}
                value={bomForm.material_id}
                onValueChange={(value) => setBomForm({ ...bomForm, material_id: value })}
                className="mb-4"
                dropdownWidth="min-w-[400px] max-w-[600px]"
                triggerMaxWidth="max-w-[400px]"
              />
              <div>
                <Label htmlFor="quantity">Kuantitas</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={bomForm.quantity}
                  onChange={(e) => setBomForm({ ...bomForm, quantity: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="unit-cost">Harga Satuan (Rp)</Label>
                  {bomForm.material_id && !unitCostManuallyEdited && (
                    <Badge variant="secondary" className="text-xs">
                      Otomatis
                    </Badge>
                  )}
                  {unitCostManuallyEdited && (
                    <Badge variant="outline" className="text-xs">
                      Manual
                    </Badge>
                  )}
                </div>
                <Input
                  id="unit-cost"
                  type="number"
                  value={bomForm.unit_cost}
                  onChange={(e) => {
                    setBomForm({ ...bomForm, unit_cost: e.target.value });
                    setUnitCostManuallyEdited(true);
                  }}
                  placeholder="0"
                />
                {bomForm.material_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {!unitCostManuallyEdited
                      ? "Harga otomatis dari bahan baku yang dipilih. Tetap bisa diubah manual."
                      : "Harga telah diubah manual. Ganti bahan baku untuk kembali ke harga otomatis."
                    }
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Input
                  id="notes"
                  value={bomForm.notes}
                  onChange={(e) => setBomForm({ ...bomForm, notes: e.target.value })}
                  placeholder="Opsional"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveBOM} className="flex-1" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button variant="outline" onClick={() => setShowBOMDialog(false)} disabled={saving}>
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Duplicate BOM Dialog */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle> Duplikasi BOM ke Produk Lain</DialogTitle>
              <DialogDescription>
                Salin komposisi bahan baku ke produk lain
              </DialogDescription>
            </DialogHeader>
            {bomToDuplicate && (
              <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-2">
                {/* Current BOM Info */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">BOM Saat Ini:</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Produk:</strong> {bomToDuplicate.product?.name}</div>
                    <div><strong>Bahan Baku:</strong> {bomToDuplicate.material?.name}</div>
                    <div><strong>Kuantitas:</strong> {bomToDuplicate.quantity} {bomToDuplicate.material?.unit}</div>
                    <div><strong>Harga Satuan:</strong> Rp {bomToDuplicate.unit_cost.toLocaleString("id-ID")}</div>
                  </div>
                </div>

                {/* Target Product Selection */}
                <SearchableSelect
                  label="Produk Tujuan"
                  placeholder="Pilih produk tujuan"
                  options={products
                    .filter(p => p.id !== bomToDuplicate.product_id) // Exclude current product
                    .map((product) => ({
                      value: product.id,
                      label: product.name,
                      description: `SKU: ${product.sku} | Rp ${product.price.toLocaleString("id-ID")}`
                    }))}
                  value={duplicateForm.target_product_id}
                  onValueChange={(value) => setDuplicateForm({ ...duplicateForm, target_product_id: value })}
                  className="mb-4"
                  dropdownWidth="min-w-[400px] max-w-[600px]"
                  triggerMaxWidth="max-w-[400px]"
                />

                {/* Validation Feedback */}
                {!duplicateValidation.isValid && duplicateForm.target_product_id && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{duplicateValidation.message}</span>
                    </div>
                  </div>
                )}

                {/* Copy Options */}
                <div className="space-y-3">
                  <h4 className="font-medium">Opsi Salin:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={duplicateForm.copy_quantity}
                        onChange={(e) => setDuplicateForm({ ...duplicateForm, copy_quantity: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Salin kuantitas ({bomToDuplicate.quantity} {bomToDuplicate.material?.unit})</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={duplicateForm.copy_unit_cost}
                        onChange={(e) => setDuplicateForm({ ...duplicateForm, copy_unit_cost: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Salin harga satuan (Rp {bomToDuplicate.unit_cost.toLocaleString("id-ID")})</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={duplicateBOM} className="flex-1" disabled={!duplicateForm.target_product_id || !duplicateValidation.isValid || duplicating}>
                    {duplicating ? "Menduplikasi..." : "Duplikasi"}
                  </Button>
                  <Button variant="outline" onClick={resetDuplicateForm} disabled={duplicating}>
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <CardTitle className="text-sm font-medium">Bahan Baku</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials.length}</div>
            <p className="text-xs text-muted-foreground">Material tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk dengan BOM</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productsWithBOM.filter(p => p.bom_items.length > 0).length}</div>
            <p className="text-xs text-muted-foreground">Memiliki komposisi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Menipis</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockMaterials.length}</div>
            <p className="text-xs text-muted-foreground">Perlu restock</p>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {lowStockMaterials.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Peringatan Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockMaterials.slice(0, 6).map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <div className="font-medium">{material.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Stok: {material.current_stock} {material.unit} (Min: {material.min_stock})
                    </div>
                  </div>
                  <Badge variant="destructive">Menipis</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Produk & BOM</TabsTrigger>
          <TabsTrigger value="variations">Variasi & BOM</TabsTrigger>
          <TabsTrigger value="bom-list">Daftar BOM</TabsTrigger>
          <TabsTrigger value="analysis">Analisis</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Produk dengan Komposisi BOM</CardTitle>
              <CardDescription>Daftar produk dan komposisi bahan bakunya</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {productsWithBOM.filter(p => p.bom_items.length > 0).map((product) => (
                  <Card key={product.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription>{product.sku}</CardDescription>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div className="text-lg font-bold">Rp {product.price.toLocaleString("id-ID")}</div>
                            <div className="text-sm text-muted-foreground">
                              Harga Jual
                            </div>
                          </div>
                          {(product as any).is_variation && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Show variation details modal or navigate to variations tab
                                alert(`Detail variasi: ${(product as any).variation_name}\nOpsi: ${(product as any).variation_options?.join(', ') || 'N/A'}`);
                              }}
                              className="text-xs"
                            >
                              <Info className="h-3 w-3 mr-1" />
                              Detail Variasi
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3">Komposisi Bahan Baku:</h4>
                          <div className="space-y-2">
                            {product.bom_items.map((bom, index) => (
                              <div key={bom.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium max-w-xs break-words whitespace-normal leading-normal">{bom.material?.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {bom.quantity} {bom.material?.unit} × Rp {bom.unit_cost.toLocaleString("id-ID")}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">Rp {bom.total_cost.toLocaleString("id-ID")}</div>
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openDuplicateDialog(bom)}
                                      className="h-6 w-6 p-0"
                                      title="Duplikasi ke produk lain"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteBOM(bom.id, (bom as any).is_variation_bom || false)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Variation Info */}
                          {(product as any).is_variation && (
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <h4 className="font-medium text-purple-800 mb-2">Informasi Variasi:</h4>
                              <div className="text-sm text-purple-600 space-y-1">
                                <div><strong>Variasi:</strong> {(product as any).variation_name}</div>
                                {(product as any).variation_options && (product as any).variation_options.length > 0 && (
                                  <div><strong>Opsi:</strong> {(product as any).variation_options.join(", ")}</div>
                                )}
                                {(product as any).stock_quantity !== undefined && (
                                  <div><strong>Stok:</strong> {(product as any).stock_quantity}</div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-800">Total Biaya Bahan Baku:</h4>
                            <div className="text-2xl font-bold text-blue-600">
                              Rp {product.total_material_cost.toLocaleString("id-ID")}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Base BOM: Rp {(product as any).base_bom_cost?.toLocaleString("id-ID") || "0"}
                              {(product as any).variation_bom_cost > 0 && (
                                <div>
                                  + Variasi BOM: Rp {(product as any).variation_bom_cost?.toLocaleString("id-ID") || "0"}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="font-medium text-green-800">Margin Laba:</h4>
                            <div className="text-2xl font-bold text-green-600">
                              {product.profit_margin.toFixed(1)}%
                            </div>
                            <div className="text-sm text-green-600">
                              Laba: Rp {(product.price - product.total_material_cost).toLocaleString("id-ID")}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Harga Jual: Rp {product.price.toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {productsWithBOM.filter(p => p.bom_items.length > 0).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada produk dengan komposisi BOM</p>
                    <p className="text-sm mt-2">Tambahkan BOM untuk produk Anda</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Variasi Produk & BOM
              </CardTitle>
              <CardDescription>
                Kelola Bill of Materials untuk setiap variasi produk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Product selector for variations */}
                <div>
                  <Label htmlFor="product-select">Pilih Produk</Label>
                  <SearchableSelect
                    id="product-select"
                    placeholder="Pilih produk untuk melihat variasinya"
                    options={products.map((product) => ({
                      value: product.id,
                      label: product.name,
                      description: `SKU: ${product.sku} | Rp ${product.price.toLocaleString("id-ID")}`
                    }))}
                    value={selectedProduct?.id || ""}
                    onValueChange={(value) => {
                      const product = products.find(p => p.id === value);
                      setSelectedProduct(product || null);
                    }}
                    className="mt-2"
                    dropdownWidth="min-w-[400px] max-w-[600px]"
                    triggerMaxWidth="max-w-[400px]"
                  />
                </div>

                {/* Display variations for selected product */}
                {selectedProduct && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Variasi untuk: {selectedProduct.name}
                    </h3>

                    {productVariations.filter(v => v.product_id === selectedProduct.id).length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <Package className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground mb-4">
                            Belum ada variasi untuk produk ini
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Silakan tambahkan variasi di halaman Manajemen Produk terlebih dahulu
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {productVariations
                          .filter(v => v.product_id === selectedProduct.id)
                          .map((variation) => (
                            <Card key={variation.id}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">{variation.name}</CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={variation.is_active ? "default" : "secondary"}>
                                      {variation.is_active ? "Aktif" : "Non-aktif"}
                                    </Badge>
                                  </div>
                                </div>
                                {variation.option_names.length > 0 && (
                                  <CardDescription>
                                    Kombinasi: {variation.option_names.join(", ")}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Harga Akhir</p>
                                    <p className="font-semibold">Rp {variation.final_price.toLocaleString("id-ID")}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Stok</p>
                                    <p className="font-semibold">{variation.stock_quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">SKU</p>
                                    <p className="font-semibold">{variation.sku || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Biaya BOM</p>
                                    <p className="font-semibold">Rp {variation.total_bom_cost.toLocaleString("id-ID")}</p>
                                  </div>
                                </div>

                                {/* BOM Items for this variation */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">Bill of Materials:</h4>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openBOMVariationDialog(variation)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Tambah BOM
                                    </Button>
                                  </div>
                                  {bomVariations.filter(bom => bom.product_variation_id === variation.id).length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground border rounded-lg">
                                      <p>Belum ada BOM untuk variasi ini</p>
                                      <p className="text-sm mt-1">Klik "Tambah BOM" untuk menambahkan bahan baku</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {bomVariations
                                        .filter(bom => bom.product_variation_id === variation.id)
                                        .map((bom) => (
                                          <div key={bom.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex-1">
                                              <div className="font-medium">{bom.material?.name}</div>
                                              <div className="text-sm text-muted-foreground">
                                                {bom.quantity} {bom.material?.unit} × Rp {bom.unit_cost.toLocaleString("id-ID")}
                                              </div>
                                              {bom.notes && (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                  Catatan: {bom.notes}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="text-right">
                                                <div className="font-semibold">Rp {bom.total_cost.toLocaleString("id-ID")}</div>
                                                <Badge variant={bom.is_active ? "default" : "secondary"} className="text-xs mt-1">
                                                  {bom.is_active ? "Aktif" : "Non-aktif"}
                                                </Badge>
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => editBOMVariation(bom)}
                                                  title="Edit BOM"
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => deleteBOMVariation(bom.id)}
                                                  title="Hapus BOM"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bom-list">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Semua Item BOM</CardTitle>
              <CardDescription>Semua komponen BOM yang terdaftar</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Bahan Baku</TableHead>
                    <TableHead>Kuantitas</TableHead>
                    <TableHead>Harga Satuan</TableHead>
                    <TableHead>Total Biaya</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((bom) => (
                    <TableRow key={bom.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="max-w-xs break-words whitespace-normal leading-normal">{bom.product?.name}</div>
                          <div className="text-sm text-muted-foreground">{bom.product?.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="max-w-xs break-words whitespace-normal leading-normal">{bom.material?.name}</div>
                          <div className="text-sm text-muted-foreground">{bom.material?.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell>{bom.quantity} {bom.material?.unit}</TableCell>
                      <TableCell>Rp {bom.unit_cost.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="font-bold">Rp {bom.total_cost.toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        <Badge variant={bom.is_active ? "default" : "secondary"}>
                          {bom.is_active ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDuplicateDialog(bom)} title="Duplikasi ke produk lain">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteBOM(bom.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bomItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada data BOM</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Produk dengan Margin Tertinggi</CardTitle>
                <CardDescription>Berdasarkan efisiensi biaya bahan baku</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productsByProfit.slice(0, 10).map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Harga: Rp {product.price.toLocaleString("id-ID")} |
                          Modal: Rp {product.total_material_cost.toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${product.profit_margin > 50 ? 'text-green-600' : product.profit_margin > 30 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {product.profit_margin.toFixed(1)}%
                        </div>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {productsByProfit.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada data untuk analisis</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analisis Material</CardTitle>
                <CardDescription>Penggunaan material dalam BOM</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.map((material) => {
                    const usageInBOM = bomItems.filter(bom => bom.material_id === material.id && bom.is_active);
                    const totalUsage = usageInBOM.reduce((sum, bom) => sum + bom.quantity, 0);

                    return (
                      <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {material.unit} | Rp {material.unit_price.toLocaleString("id-ID")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {usageInBOM.length} produk
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total {totalUsage} {material.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {materials.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada material</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* BOM Variation Dialog */}
      <Dialog open={showBOMVariationDialog} onOpenChange={setShowBOMVariationDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingBOMVariation ? 'Edit BOM Variasi' : 'Tambah BOM Variasi'}
            </DialogTitle>
            <DialogDescription>
              {selectedVariation && (
                <>Tambahkan bahan baku untuk variasi: <strong>{selectedVariation.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-2">
            <div>
              <Label htmlFor="material-select">Bahan Baku</Label>
              <SearchableSelect
                id="material-select"
                placeholder="Pilih bahan baku"
                options={materials.map((material) => ({
                  value: material.id,
                  label: material.name,
                  description: `${material.unit} | Rp ${material.unit_price.toLocaleString("id-ID")} | Stok: ${material.current_stock}`
                }))}
                value={bomVariationForm.material_id}
                onValueChange={(value) => setBomVariationForm({ ...bomVariationForm, material_id: value })}
                className="mt-2"
                dropdownWidth="min-w-[400px] max-w-[600px]"
                triggerMaxWidth="max-w-[400px]"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Kuantitas</Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                min="0.001"
                value={bomVariationForm.quantity}
                onChange={(e) => setBomVariationForm({ ...bomVariationForm, quantity: e.target.value })}
                placeholder="1"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="unit-cost">Harga Satuan (Rp)</Label>
                {bomVariationForm.material_id && !bomVariationUnitCostManuallyEdited && (
                  <Badge variant="secondary" className="text-xs">
                    Otomatis
                  </Badge>
                )}
                {bomVariationUnitCostManuallyEdited && (
                  <Badge variant="outline" className="text-xs">
                    Manual
                  </Badge>
                )}
              </div>
              <Input
                id="unit-cost"
                type="number"
                value={bomVariationForm.unit_cost}
                onChange={(e) => {
                  setBomVariationForm({ ...bomVariationForm, unit_cost: e.target.value });
                  setBomVariationUnitCostManuallyEdited(true);
                }}
                placeholder="0"
              />
              {bomVariationForm.material_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  {!bomVariationUnitCostManuallyEdited
                    ? "Harga otomatis dari bahan baku yang dipilih. Tetap bisa diubah manual."
                    : "Harga telah diubah manual."}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={bomVariationForm.notes}
                onChange={(e) => setBomVariationForm({ ...bomVariationForm, notes: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBOMVariationDialog(false)} disabled={savingVariation}>
                Batal
              </Button>
              <Button onClick={saveBOMVariation} disabled={savingVariation}>
                {savingVariation ? (editingBOMVariation ? "Mengupdate..." : "Menyimpan...") : (editingBOMVariation ? 'Update' : 'Simpan')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}