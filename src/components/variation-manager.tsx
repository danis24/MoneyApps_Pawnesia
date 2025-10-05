"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Package, Tag, Palette } from "lucide-react";
import { createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useAuth } from "@clerk/nextjs";
import type {
  VariationType,
  VariationOption,
  VariationWithType,
  ProductVariationForm,
  ProductVariationWithDetails
} from "@/types/variations";

interface VariationManagerProps {
  productId: string;
  productName: string;
  onVariationsChange?: (variations: ProductVariationWithDetails[]) => void;
}

export default function VariationManager({ productId, productName, onVariationsChange }: VariationManagerProps) {
  const { getToken, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [variationOptions, setVariationOptions] = useState<VariationWithType[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariationWithDetails[]>([]);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  const [showProductVariationDialog, setShowProductVariationDialog] = useState(false);
  const [editingVariation, setEditingVariation] = useState<VariationType | null>(null);
  const [editingOption, setEditingOption] = useState<VariationOption | null>(null);

  // Forms
  const [variationForm, setVariationForm] = useState({ name: "", description: "" });
  const [optionForm, setOptionForm] = useState({ variation_type_id: "", name: "", description: "" });
  const [productVariationForm, setProductVariationForm] = useState<ProductVariationForm>({
    name: "",
    sku: "",
    price_adjustment: 0,
    stock_quantity: 0,
    selected_options: []
  });

  // Get option name by ID
  const getOptionName = useCallback((optionId: string) => {
    const option = variationOptions.find(opt => opt.id === optionId);
    return option?.name || '';
  }, [variationOptions]);

  // Check if an option should be disabled based on current selections
  const isOptionDisabled = useCallback((optionId: string) => {
    // No compatibility validation - all options are compatible
    return false;
  }, []);

  const ensureUserVariationTypes = useCallback(async (userId: string) => {
    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);

      // Check if user already has variation types
      const { data: userTypes, error: checkError } = await supabase
        .from("variation_types")
        .select("count")
        .eq("user_id", userId);

      if (checkError) throw checkError;

      // If user has no variation types, copy from system
      if (!userTypes || userTypes.length === 0) {
        // Call the RPC function to copy system variation types
        const { error: copyError } = await supabase.rpc('copy_system_variation_types', {
          target_user_id: userId
        });

        if (copyError) {
          console.error("Error copying system variation types:", copyError);
          // Fallback: insert basic variation types manually
          await insertBasicVariationTypes(userId, supabase);
        }
      }
    } catch (error) {
      console.error("Error ensuring user variation types:", error);
      // Fallback: insert basic variation types manually
      await insertBasicVariationTypes(userId, createSupabaseClientWithAuth(await getToken()));
    }
  }, [getToken]);

  const insertBasicVariationTypes = async (userId: string, supabase: ReturnType<typeof createSupabaseClientWithAuth>) => {
    try {
      // Insert basic variation types
      const { error: typesError } = await supabase
        .from("variation_types")
        .insert([
          { name: "Warna", description: "Variasi warna produk", user_id: userId },
          { name: "Motif", description: "Variasi motif produk", user_id: userId },
          { name: "Ukuran", description: "Variasi ukuran produk", user_id: userId }
        ]);

      if (typesError) throw typesError;

      // Get the inserted types
      const { data: types } = await supabase
        .from("variation_types")
        .select("id, name")
        .eq("user_id", userId);

      if (!types) return;

      // Insert basic color options
      const colorType = types.find(t => t.name === "Warna");
      if (colorType) {
        await supabase
          .from("variation_options")
          .insert([
            { variation_type_id: colorType.id, name: "Merah", description: "Warna merah", user_id: userId },
            { variation_type_id: colorType.id, name: "Biru", description: "Warna biru", user_id: userId },
            { variation_type_id: colorType.id, name: "Hijau", description: "Warna hijau", user_id: userId },
            { variation_type_id: colorType.id, name: "Kuning", description: "Warna kuning", user_id: userId },
            { variation_type_id: colorType.id, name: "Pink", description: "Warna pink", user_id: userId }
          ]);
      }

      // Insert basic pattern options
      const patternType = types.find(t => t.name === "Motif");
      if (patternType) {
        await supabase
          .from("variation_options")
          .insert([
            { variation_type_id: patternType.id, name: "Polos", description: "Tanpa motif", user_id: userId },
            { variation_type_id: patternType.id, name: "Tulang", description: "Motif tulang", user_id: userId }
          ]);
      }
    } catch (error) {
      console.error("Error inserting basic variation types:", error);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);

      // First, ensure user has variation types (copy from system if needed)
      if (userId) {
        await ensureUserVariationTypes(userId);
      }

      // Fetch variation types
      const { data: typesData } = await supabase
        .from("variation_types")
        .select("*")
        .order("name");

      // Fetch variation options with type names
      const { data: optionsData } = await supabase
        .from("variation_options")
        .select(`
          *,
          variation_types (name)
        `)
        .order("name");

      // Fetch product variations
      const { data: variationsData } = await supabase
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
        .eq("product_id", productId)
        .order("name");

      // Fetch BOM variations for each product variation
      const { data: bomData } = await supabase
        .from("bom_variations")
        .select("*")
        .in("product_variation_id", variationsData?.map(v => v.id) || []);

      if (typesData) setVariationTypes(typesData);
      if (optionsData) {
        const optionsWithTypes = optionsData.map(option => ({
          ...option,
          variation_type_name: option.variation_types?.name || ""
        }));
        setVariationOptions(optionsWithTypes);
      }

      if (variationsData) {
        const variationsWithDetails = variationsData.map(variation => {
          const combinations = variation.variation_combinations || [];
          const optionNames = combinations
            .map(c => c.variation_options?.name)
            .filter(Boolean) as string[];

          const variationBOMs = bomData?.filter(bom => bom.product_variation_id === variation.id) || [];
          const totalBomCost = variationBOMs.reduce((sum, bom) => sum + Number(bom.total_cost), 0);

          return {
            ...variation,
            option_names: optionNames,
            total_bom_cost: totalBomCost,
            combinations: combinations
          };
        });
        setProductVariations(variationsWithDetails);
        onVariationsChange?.(variationsWithDetails);
      }
    } catch (error) {
      console.error("Error fetching variation data:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, userId, onVariationsChange, productId, ensureUserVariationTypes]);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId, fetchData]);

  const createVariationType = async () => {
    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);
      if (!userId) return;

      if (editingVariation) {
        // Update existing variation type
        const { error } = await supabase
          .from("variation_types")
          .update({
            name: variationForm.name,
            description: variationForm.description
          })
          .eq("id", editingVariation.id);

        if (error) throw error;
      } else {
        // Create new variation type
        const { error } = await supabase
          .from("variation_types")
          .insert([{
            name: variationForm.name,
            description: variationForm.description,
            user_id: userId
          }]);

        if (error) throw error;
      }

      setVariationForm({ name: "", description: "" });
      setShowVariationDialog(false);
      setEditingVariation(null);
      fetchData();
    } catch (error) {
      console.error("Error saving variation type:", error);
      alert("Gagal menyimpan tipe variasi");
    }
  };

  const updateVariationType = async (type: VariationType) => {
    setVariationForm({
      name: type.name,
      description: type.description || ""
    });
    setEditingVariation(type);
    setShowVariationDialog(true);
  };

  const deleteVariationType = async (typeId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tipe variasi ini? Ini juga akan menghapus semua opsi yang terkait.")) {
      return;
    }

    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);

      const { error } = await supabase
        .from("variation_types")
        .delete()
        .eq("id", typeId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error deleting variation type:", error);
      alert("Gagal menghapus tipe variasi");
    }
  };

  const createVariationOption = async () => {
    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);
      if (!userId) return;

      if (editingOption) {
        // Update existing variation option
        const { error } = await supabase
          .from("variation_options")
          .update({
            variation_type_id: optionForm.variation_type_id,
            name: optionForm.name,
            description: optionForm.description
          })
          .eq("id", editingOption.id);

        if (error) throw error;
      } else {
        // Create new variation option
        const { error } = await supabase
          .from("variation_options")
          .insert([{
            variation_type_id: optionForm.variation_type_id,
            name: optionForm.name,
            description: optionForm.description,
            user_id: userId
          }]);

        if (error) throw error;
      }

      setOptionForm({ variation_type_id: "", name: "", description: "" });
      setShowVariationDialog(false);
      setEditingOption(null);
      fetchData();
    } catch (error) {
      console.error("Error saving variation option:", error);
      alert("Gagal menyimpan opsi variasi");
    }
  };

  const updateVariationOption = async (option: VariationOption) => {
    setOptionForm({
      variation_type_id: option.variation_type_id,
      name: option.name,
      description: option.description || ""
    });
    setEditingOption(option);
    setShowVariationDialog(true);
  };

  const deleteVariationOption = async (optionId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus opsi variasi ini?")) {
      return;
    }

    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);

      const { error } = await supabase
        .from("variation_options")
        .delete()
        .eq("id", optionId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error deleting variation option:", error);
      alert("Gagal menghapus opsi variasi");
    }
  };

  const createProductVariation = async () => {
    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);
      if (!userId) return;

      // Create product variation
      const { data: newVariation, error: variationError } = await supabase
        .from("product_variations")
        .insert([{
          product_id: productId,
          name: productVariationForm.name,
          sku: productVariationForm.sku,
          price_adjustment: productVariationForm.price_adjustment,
          stock_quantity: productVariationForm.stock_quantity,
          user_id: userId
        }])
        .select()
        .single();

      if (variationError) throw variationError;

      // Create variation combinations
      if (productVariationForm.selected_options.length > 0) {
        const combinations = productVariationForm.selected_options.map(optionId => ({
          product_variation_id: newVariation.id,
          variation_option_id: optionId,
          user_id: userId
        }));

        const { error: combinationError } = await supabase
          .from("variation_combinations")
          .insert(combinations);

        if (combinationError) throw combinationError;
      }

      setProductVariationForm({
        name: "",
        sku: "",
        price_adjustment: 0,
        stock_quantity: 0,
        selected_options: []
      });
      setShowProductVariationDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error creating product variation:", error);
      alert("Gagal membuat variasi produk");
    }
  };

  const deleteProductVariation = async (variationId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus variasi ini?")) return;

    try {
      const token = await getToken();
      const supabase = createSupabaseClientWithAuth(token);

      const { error } = await supabase
        .from("product_variations")
        .delete()
        .eq("id", variationId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error deleting product variation:", error);
      alert("Gagal menghapus variasi produk");
    }
  };

  const generateVariationName = useCallback(() => {
    const selectedOptionsByType = productVariationForm.selected_options
      .map(optionId => {
        const option = variationOptions.find(opt => opt.id === optionId);
        return option;
      })
      .filter(Boolean)
      .reduce((acc, option) => {
        if (!acc[option.variation_type_name]) {
          acc[option.variation_type_name] = [];
        }
        acc[option.variation_type_name].push(option.name);
        return acc;
      }, {} as Record<string, string[]>);

    if (Object.keys(selectedOptionsByType).length === 0) return "";

    // Build variation name by combining selected options with their type names
    const nameParts: string[] = [];

    Object.entries(selectedOptionsByType).forEach(([typeName, options]) => {
      if (options.length === 1) {
        nameParts.push(`${typeName} ${options[0]}`);
      } else if (options.length > 1) {
        nameParts.push(`${typeName} ${options.join(", ")}`);
      }
    });

    // If only one type is selected, just use the product name with the variation
    if (nameParts.length === 1) {
      return `${productName} ${nameParts[0]}`;
    }

    // If multiple types are selected, combine them
    return `${productName} ${nameParts.join(" ")}`;
  }, [productVariationForm.selected_options, variationOptions, productName]);

  useEffect(() => {
    const name = generateVariationName();
    if (name) {
      setProductVariationForm(prev => ({ ...prev, name }));
    }
  }, [productVariationForm.selected_options, generateVariationName, productName]);

  if (loading) {
    return <div className="text-center py-4">Memuat variasi...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Variasi Produk</h3>
          <p className="text-sm text-muted-foreground">
            Kelola variasi untuk produk: {productName}
          </p>
        </div>
        <Dialog open={showProductVariationDialog} onOpenChange={setShowProductVariationDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Variasi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Tambah Variasi Produk</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              <div>
                <Label htmlFor="variation-name">Nama Variasi</Label>
                <Input
                  id="variation-name"
                  value={productVariationForm.name}
                  onChange={(e) => setProductVariationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mis: Biru, Biru + Lonceng"
                />
              </div>

              <div>
                <Label className="text-base font-medium mb-4 block">Kombinasi Variasi</Label>
                                <div className="space-y-4">
                  {variationTypes.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-gray-500 mb-2">
                        <Tag className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Belum ada tipe variasi</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowVariationDialog(true);
                          setShowProductVariationDialog(false);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Tipe Variasi
                      </Button>
                    </div>
                  ) : (
                    variationTypes.map(type => {
                      const typeOptions = variationOptions.filter(opt => opt.variation_type_id === type.id);
                      const selectedCount = typeOptions.filter(opt =>
                        productVariationForm.selected_options.includes(opt.id)
                      ).length;

                      return (
                        <div key={type.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <div>
                                  <Label className="font-medium text-gray-700">{type.name}</Label>
                                  {type.description && (
                                    <span className="text-xs text-gray-500 block">({type.description})</span>
                                  )}
                                  <span className="text-xs text-blue-600">Maksimal pilih 1 opsi</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {selectedCount > 0 ? '1 dipilih' : '0 dipilih'} / 1
                              </Badge>
                            </div>
                          </div>

                          {/* Options */}
                          <div className="p-4">
                            {typeOptions.length === 0 ? (
                              <div className="text-center py-4 text-gray-500">
                                <p className="text-sm">Belum ada opsi untuk tipe ini</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => {
                                    setOptionForm({ variation_type_id: type.id, name: "", description: "" });
                                    setEditingOption(null);
                                    setShowVariationDialog(true);
                                    setShowProductVariationDialog(false);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Tambah Opsi
                                </Button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {typeOptions.map(opt => {
                                  const isSelected = productVariationForm.selected_options.includes(opt.id);
                                  const isDisabled = isOptionDisabled(opt.id);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center space-x-2 p-2 rounded border transition-colors ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-50'
                                          : isDisabled
                                            ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                                            : 'border-gray-200 cursor-pointer hover:bg-gray-50'
                                      }`}
                                      onClick={() => {
                                        if (isDisabled) return; // Prevent interaction if disabled

                                        if (isSelected) {
                                          // Allow deselection by clicking again
                                          setProductVariationForm(prev => ({
                                            ...prev,
                                            selected_options: prev.selected_options.filter(id => id !== opt.id)
                                          }));
                                        } else {
                                          // Select this option and deselect others from the same type
                                          const otherTypeOptions = productVariationForm.selected_options.filter(id =>
                                            !typeOptions.some(typeOpt => typeOpt.id === id)
                                          );
                                          setProductVariationForm(prev => ({
                                            ...prev,
                                            selected_options: [...otherTypeOptions, opt.id]
                                          }));
                                        }
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        id={`option-${opt.id}`}
                                        checked={isSelected}
                                        disabled={isDisabled}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            // Select this option and deselect others from the same type
                                            const otherTypeOptions = productVariationForm.selected_options.filter(id =>
                                              !typeOptions.some(typeOpt => typeOpt.id === id)
                                            );
                                            setProductVariationForm(prev => ({
                                              ...prev,
                                              selected_options: [...otherTypeOptions, opt.id]
                                            }));
                                          } else {
                                            // Deselect this option
                                            setProductVariationForm(prev => ({
                                              ...prev,
                                              selected_options: prev.selected_options.filter(id => id !== opt.id)
                                            }));
                                          }
                                        }}
                                        className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                          isDisabled ? 'cursor-not-allowed opacity-50' : ''
                                        }`}
                                      />
                                      <label
                                        htmlFor={`option-${opt.id}`}
                                        className={`text-sm flex-1 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                      >
                                        <div className="font-medium">{opt.name}</div>
                                        {opt.description && (
                                          <div className="text-xs text-gray-500">{opt.description}</div>
                                        )}
                                                                              </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6"
                                onClick={() => {
                                  setOptionForm({ variation_type_id: type.id, name: "", description: "" });
                                  setEditingOption(null);
                                  setShowVariationDialog(true);
                                  setShowProductVariationDialog(false);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Tambah Opsi
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6"
                                onClick={() => {
                                  updateVariationType(type);
                                  setShowProductVariationDialog(false);
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit Tipe
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Summary */}
                {productVariationForm.selected_options.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">
                      Opsi yang Dipilih ({productVariationForm.selected_options.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {productVariationForm.selected_options.map(optionId => {
                        const option = variationOptions.find(opt => opt.id === optionId);
                        return option ? (
                          <Badge key={option.id} variant="secondary" className="text-xs">
                            {option.variation_type_name}: {option.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price-adjustment">Penyesuaian Harga</Label>
                  <Input
                    id="price-adjustment"
                    type="number"
                    value={productVariationForm.price_adjustment}
                    onChange={(e) => setProductVariationForm(prev => ({
                      ...prev,
                      price_adjustment: Number(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="stock-quantity">Stok</Label>
                  <Input
                    id="stock-quantity"
                    type="number"
                    value={productVariationForm.stock_quantity}
                    onChange={(e) => setProductVariationForm(prev => ({
                      ...prev,
                      stock_quantity: Number(e.target.value)
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sku">SKU (Opsional)</Label>
                <Input
                  id="sku"
                  value={productVariationForm.sku}
                  onChange={(e) => setProductVariationForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU variasi"
                />
              </div>
            </div>

            {/* Button Actions di luar scrollable area */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={createProductVariation} className="flex-1">
                Simpan Variasi
              </Button>
              <Button variant="outline" onClick={() => setShowProductVariationDialog(false)}>
                Batal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for managing variations */}
      <Tabs defaultValue="variations" className="w-full">
        <TabsList>
          <TabsTrigger value="variations">
            <Package className="h-4 w-4 mr-2" />
            Variasi Produk
          </TabsTrigger>
          <TabsTrigger value="manage-types">
            <Tag className="h-4 w-4 mr-2" />
            Kelola Tipe Variasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variations" className="space-y-4">
          {productVariations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Belum ada variasi untuk produk ini</p>
                <Button onClick={() => setShowProductVariationDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Variasi Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {productVariations.map(variation => (
                <Card key={variation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{variation.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={variation.is_active ? "default" : "secondary"}>
                          {variation.is_active ? "Aktif" : "Non-aktif"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProductVariation(variation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    {variation.option_names.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Kombinasi Variasi:</p>
                        <div className="flex flex-wrap gap-2">
                          {variation.combinations?.map((combo, index) => {
                            const option = combo.variation_options;
                            if (!option) return null;

                            return (
                              <Badge
                                key={`${option.id}_${index}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                <span className="font-medium">{option.variation_types?.name}:</span> {option.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage-types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tipe Variasi</CardTitle>
                <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Tipe
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>
                        {editingVariation ? 'Edit Tipe Variasi' : 'Tambah Tipe Variasi'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                      <Tabs defaultValue="type" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="type">Tipe Variasi</TabsTrigger>
                          <TabsTrigger value="option">Opsi Variasi</TabsTrigger>
                        </TabsList>
                        <TabsContent value="type" className="space-y-4">
                          <div>
                            <Label htmlFor="type-name">Nama Tipe</Label>
                            <Input
                              id="type-name"
                              value={variationForm.name}
                              onChange={(e) => setVariationForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Mis: Warna, Ukuran, Motif"
                            />
                          </div>
                          <div>
                            <Label htmlFor="type-description">Deskripsi</Label>
                            <Textarea
                              id="type-description"
                              value={variationForm.description}
                              onChange={(e) => setVariationForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Deskripsi tipe variasi"
                            />
                          </div>
                          <Button onClick={createVariationType} className="w-full">
                            {editingVariation ? 'Update Tipe Variasi' : 'Simpan Tipe Variasi'}
                          </Button>
                        </TabsContent>
                        <TabsContent value="option" className="space-y-4">
                          <div>
                            <Label htmlFor="option-type">Tipe Variasi</Label>
                            <Select
                              value={optionForm.variation_type_id}
                              onValueChange={(value) => setOptionForm(prev => ({ ...prev, variation_type_id: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih tipe variasi" />
                              </SelectTrigger>
                              <SelectContent>
                                {variationTypes.map(type => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="option-name">Nama Opsi</Label>
                            <Input
                              id="option-name"
                              value={optionForm.name}
                              onChange={(e) => setOptionForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Mis: Merah, Biru, S, M"
                            />
                          </div>
                          <div>
                            <Label htmlFor="option-description">Deskripsi</Label>
                            <Textarea
                              id="option-description"
                              value={optionForm.description}
                              onChange={(e) => setOptionForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Deskripsi opsi variasi"
                            />
                          </div>
                          <Button onClick={createVariationOption} className="w-full">
                            {editingOption ? 'Update Opsi Variasi' : 'Simpan Opsi Variasi'}
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Variation Types */}
              <div>
                <h4 className="font-medium mb-3">Tipe Variasi</h4>
                <div className="grid gap-3">
                  {variationTypes.map(type => {
                    const typeOptions = variationOptions.filter(opt => opt.variation_type_id === type.id);
                    return (
                      <div key={type.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-700">{type.name}</div>
                              {type.description && (
                                <div className="text-sm text-gray-500">{type.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {typeOptions.length} opsi
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateVariationType(type)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteVariationType(type.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Options for this type */}
                        <div className="p-3">
                          {typeOptions.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {typeOptions.map(option => (
                                <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                  <div>
                                    <div className="font-medium text-sm">{option.name}</div>
                                    {option.description && (
                                      <div className="text-xs text-gray-500">{option.description}</div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => updateVariationOption(option)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => deleteVariationOption(option.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-gray-500 text-sm">
                              Belum ada opsi untuk tipe ini
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {variationTypes.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-gray-500 mb-2">
                        <Tag className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Belum ada tipe variasi</p>
                      </div>
                      <Button onClick={() => setShowVariationDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Tipe Variasi Pertama
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}