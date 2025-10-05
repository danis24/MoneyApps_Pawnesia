"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  Calendar,
  Store,
  FileText,
  Calculator,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface Shop {
  id: string;
  name: string;
  channel: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  is_active: boolean;
}

interface SaleItem {
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function NewSalePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedShop, setSelectedShop] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [platformFee, setPlatformFee] = useState("0");
  const [shippingFee, setShippingFee] = useState("0");
  const [notes, setNotes] = useState("");

  // Sale items
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");

  // Stock validation
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn && user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user]);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const [shopsResponse, productsResponse] = await Promise.all([
        authSupabase
          .from("shops")
          .select("*")
          .eq("user_id", user?.id)
          .eq("is_active", true)
          .order("name"),

        authSupabase
          .from("products")
          .select("*")
          .eq("user_id", user?.id)
          .eq("is_active", true)
          .order("name")
      ]);

      setShops(shopsResponse.data || []);
      setProducts(productsResponse.data || []);

      // Auto-select first shop if available
      if (shopsResponse.data && shopsResponse.data.length > 0) {
        setSelectedShop(shopsResponse.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSaleItem = () => {
    if (!selectedProduct || !quantity) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const quantityNum = parseInt(quantity);
    const unitPrice = product.price;
    const totalPrice = quantityNum * unitPrice;

    const newItem: SaleItem = {
      product_id: selectedProduct,
      product,
      quantity: quantityNum,
      unit_price: unitPrice,
      total_price: totalPrice,
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedProduct("");
    setQuantity("1");
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const getSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const platformFeeNum = parseFloat(platformFee) || 0;
    const shippingFeeNum = parseFloat(shippingFee) || 0;
    return subtotal + platformFeeNum + shippingFeeNum;
  };

  const validateStock = async () => {
    const warnings: string[] = [];

    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      for (const item of saleItems) {
        if (!item.product) continue;

        // Get BOM for the product
        const { data: bomData } = await authSupabase
          .from("product_bom")
          .select(`
            material_id,
            quantity,
            material:materials (
              name,
              current_stock,
              min_stock,
              unit
            )
          `)
          .eq("product_id", item.product_id);

        if (!bomData || bomData.length === 0) {
          // No BOM defined, use basic quantity warning
          if (item.quantity > 100) {
            warnings.push(`${item.product.name} - Quantity ${item.quantity} seems high (no BOM defined)`);
          }
          continue;
        }

        // Check each material in the BOM
        for (const bomItem of bomData) {
          const material = bomItem.material;
          if (!material || material.length === 0) continue;

          const materialData = material[0];
          const requiredQuantity = bomItem.quantity * item.quantity;
          const availableStock = materialData.current_stock;
          const shortfall = requiredQuantity - availableStock;

          if (shortfall > 0) {
            warnings.push(
              `${item.product.name} - Material ${materialData.name} kekurangan ${shortfall} ${materialData.unit} ` +
              `(butuh: ${requiredQuantity}, tersedia: ${availableStock})`
            );
          }

          // Check if stock will fall below minimum
          const remainingStock = availableStock - requiredQuantity;
          if (remainingStock < materialData.min_stock) {
            warnings.push(
              `${item.product.name} - Material ${materialData.name} akan di bawah stok minimum ` +
              `(sisa: ${remainingStock} ${materialData.unit}, minimum: ${materialData.min_stock} ${materialData.unit})`
            );
          }
        }
      }

    } catch (error) {
      console.error("Error validating stock:", error);
      warnings.push("Gagal memvalidasi stok. Silakan coba lagi.");
    }

    setStockWarnings(warnings);
    return warnings.length === 0;
  };

  const saveSale = async () => {
    if (!selectedShop || saleItems.length === 0) {
      alert("Silakan pilih toko dan tambahkan minimal 1 produk");
      return;
    }

    setSaving(true);

    try {
      const isValidStock = await validateStock();
      if (!isValidStock && stockWarnings.length > 0) {
        const proceed = confirm(
          "Ada peringatan stok:\n" +
          stockWarnings.join("\n") +
          "\n\nLanjutkan transaksi?"
        );
        if (!proceed) {
          setSaving(false);
          return;
        }
      }

      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Generate invoice number using RPC
      const { data: invoiceData, error: invoiceError } = await authSupabase
        .rpc('generate_invoice_number_rpc');

      if (invoiceError) throw invoiceError;

      const invoiceNumber = invoiceData;

      // Create sale
      const { data: sale, error: saleError } = await authSupabase
        .from("sales")
        .insert({
          invoice_number: invoiceNumber,
          shop_id: selectedShop,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          sale_date: new Date(saleDate).toISOString(),
          total_amount: getTotal(),
          platform_fee: parseFloat(platformFee) || 0,
          shipping_fee: parseFloat(shippingFee) || 0,
          notes: notes || null,
          user_id: user?.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsToInsert = saleItems.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        user_id: user?.id,
      }));

      const { error: itemsError } = await authSupabase
        .from("sale_items")
        .insert(saleItemsToInsert);

      if (itemsError) throw itemsError;

      // Create finance transaction
      const { error: financeError } = await authSupabase
        .from("transactions")
        .insert({
          category_id: null, // TODO: Get sales category ID
          description: `Penjualan - ${invoiceNumber}`,
          amount: getTotal(),
          type: 'income',
          transaction_date: new Date(saleDate).toISOString(),
          reference_id: sale.id,
          reference_type: 'sale',
          user_id: user?.id,
        });

      if (financeError) throw financeError;

      // Update material stock based on BOM
      for (const item of saleItems) {
        // Get BOM for the product
        const { data: bomData } = await authSupabase
          .from("product_bom")
          .select("material_id, quantity")
          .eq("product_id", item.product_id);

        if (bomData) {
          for (const bomItem of bomData) {
            const deductionAmount = bomItem.quantity * item.quantity;

            // Update material stock using RPC
            const { error: stockError } = await authSupabase.rpc('decrement_material_stock', {
              material_id: bomItem.material_id,
              amount: deductionAmount
            });

            if (stockError) {
              console.error("Error updating material stock:", stockError);
            }
          }
        }
      }

      // Reset form and redirect
      alert("Penjualan berhasil disimpan!\nNo. Invoice: " + invoiceNumber);

      // Reset form
      setSelectedShop(shops.length > 0 ? shops[0].id : "");
      setCustomerName("");
      setCustomerPhone("");
      setSaleDate(new Date().toISOString().split('T')[0]);
      setPlatformFee("0");
      setShippingFee("0");
      setNotes("");
      setSaleItems([]);
      setStockWarnings([]);

    } catch (error) {
      console.error("Error saving sale:", error);
      alert("Gagal menyimpan penjualan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
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
            Silakan masuk untuk membuat transaksi penjualan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales">
          <Button variant="outline">
            ← Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Input Penjualan Baru</h1>
          <p className="text-muted-foreground">
            Buat transaksi penjualan untuk berbagai channel
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shop & Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Informasi Toko & Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shop">Toko/Channel *</Label>
                <Select value={selectedShop} onValueChange={setSelectedShop}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih toko" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{shop.channel}</Badge>
                          {shop.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nama Pelanggan</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">No. Telepon</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="saleDate">Tanggal Penjualan</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="product">Produk</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - Rp {product.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={addSaleItem}
                    disabled={!selectedProduct || !quantity}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah
                  </Button>
                </div>
              </div>

              {/* Sale Items Table */}
              {saleItems.length > 0 && (
                <div>
                  <Label>Daftar Produk</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell>Rp {item.unit_price.toLocaleString()}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>Rp {item.total_price.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSaleItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Biaya Tambahan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platformFee">Fee Platform</Label>
                  <Input
                    id="platformFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={platformFee}
                    onChange={(e) => setPlatformFee(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="shippingFee">Ongkos Kirim</Label>
                  <Input
                    id="shippingFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ringkasan Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rp {getSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee Platform</span>
                  <span>Rp {(parseFloat(platformFee) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkos Kirim</span>
                  <span>Rp {(parseFloat(shippingFee) || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>Rp {getTotal().toLocaleString()}</span>
                </div>
              </div>

              {stockWarnings.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center gap-2 text-orange-800 mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Peringatan Stok</span>
                  </div>
                  <div className="text-sm text-orange-700 space-y-1">
                    {stockWarnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={saveSale}
                disabled={saving || !selectedShop || saleItems.length === 0}
                className="w-full"
                size="lg"
              >
                {saving ? "Menyimpan..." : "Simpan Penjualan"}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Cetak Invoice
              </Button>
              <Button variant="outline" className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Cek Stok
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}