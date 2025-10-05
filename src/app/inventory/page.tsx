"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  TrendingUp,
  TrendingDown,
  Clock,
  History,
  Box,
  Warehouse,
  Calculator,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";

interface Material {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  created_at: string;
}

interface StockStatus {
  status: string;
  color: "default" | "secondary" | "destructive" | "outline";
  text: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  is_active: boolean;
}

interface StockHistory {
  id: string;
  material_id?: string;
  product_id?: string;
  type: string;
  quantity: number;
  remaining_stock: number;
  reference_id?: string;
  reference_type: string;
  notes: string;
  created_at: string;
  materials?: {
    name: string;
    unit: string;
  };
  products?: {
    name: string;
  };
}

interface StockAdjustment {
  material_id: string;
  quantity: number;
  type: string;
  notes: string;
}

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  const [adjustmentForm, setAdjustmentForm] = useState<StockAdjustment>({
    material_id: "",
    quantity: 0,
    type: "in",
    notes: "",
  });

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

      // Fetch materials
      const { data: materialsData } = await authSupabase
        .from("materials")
        .select("*")
        .eq("user_id", user?.id)
        .order("name");

      // Fetch products
      const { data: productsData } = await authSupabase
        .from("products")
        .select("id, name, sku, price, is_active")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("name");

      // Fetch stock history
      const { data: historyData } = await authSupabase
        .from("stock_history")
        .select(`
          *,
          materials (
            name,
            unit
          ),
          products (
            name
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setMaterials(materialsData || []);
      setProducts(productsData || []);
      setStockHistory(historyData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (material: Material) => {
    if (material.current_stock <= 0) return { status: "out", color: "destructive", text: "Habis" };
    if (material.current_stock <= material.min_stock) return { status: "low", color: "destructive", text: "Kurang" };
    if (material.current_stock <= material.min_stock * 1.5) return { status: "warning", color: "secondary", text: "Hampir Habis" };
    return { status: "good", color: "default", text: "Cukup" };
  };

  const getTotalInventoryValue = () => {
    return materials.reduce((total, material) => {
      return total + (material.current_stock * material.unit_price);
    }, 0);
  };

  const getLowStockMaterials = () => {
    return materials.filter(material => material.current_stock <= material.min_stock);
  };

  const saveStockAdjustment = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);
      const material = materials.find(m => m.id === adjustmentForm.material_id);
      if (!material) return;

      const newStock = adjustmentForm.type === "in"
        ? material.current_stock + adjustmentForm.quantity
        : material.current_stock - adjustmentForm.quantity;

      // Update material stock
      const { error: updateError } = await authSupabase
        .from("materials")
        .update({ current_stock: newStock })
        .eq("id", adjustmentForm.material_id);

      if (updateError) throw updateError;

      // Record stock history
      const { error: historyError } = await authSupabase
        .from("stock_history")
        .insert({
          material_id: adjustmentForm.material_id,
          type: adjustmentForm.type,
          quantity: adjustmentForm.quantity,
          remaining_stock: newStock,
          reference_type: "adjustment",
          notes: adjustmentForm.notes,
          user_id: user?.id,
        });

      if (historyError) throw historyError;

      setShowAdjustmentDialog(false);
      setAdjustmentForm({
        material_id: "",
        quantity: 0,
        type: "in",
        notes: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving adjustment:", error);
      alert("Gagal menyimpan penyesuaian stok");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "in": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "out": return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "adjustment": return <Calculator className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "in": return "Masuk";
      case "out": return "Keluar";
      case "adjustment": return "Penyesuaian";
      default: return type;
    }
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
            Silakan masuk untuk mengakses halaman inventori
          </p>
        </div>
      </div>
    );
  }

  const totalValue = getTotalInventoryValue();
  const lowStockItems = getLowStockMaterials();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8" />
            Manajemen Stok & Gudang
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitoring stok bahan baku dan riwayat pergerakan stok
          </p>
        </div>
        <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Penyesuaian Stok
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Penyesuaian Stok</DialogTitle>
              <DialogDescription>
                Tambah atau kurangi stok bahan baku
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="material">Bahan</Label>
                <Select
                  value={adjustmentForm.material_id}
                  onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, material_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bahan" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.current_stock} {material.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Tipe</Label>
                <Select
                  value={adjustmentForm.type}
                  onValueChange={(value) => setAdjustmentForm({ ...adjustmentForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stok Masuk</SelectItem>
                    <SelectItem value="out">Stok Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Input
                  id="notes"
                  value={adjustmentForm.notes}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                  placeholder="Alasan penyesuaian"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveStockAdjustment} className="flex-1">
                  Simpan
                </Button>
                <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Stok</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalValue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">Nilai semua bahan baku</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jenis Bahan</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials.length}</div>
            <p className="text-xs text-muted-foreground">Total jenis bahan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Perlu segera diisi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Siap untuk dijual</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="materials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="materials">Daftar Bahan</TabsTrigger>
          <TabsTrigger value="low-stock">Stok Menipis</TabsTrigger>
          <TabsTrigger value="history">Riwayat Stok</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Bahan Baku</CardTitle>
              <CardDescription>Monitoring stok semua bahan baku</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Bahan</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Minimum</TableHead>
                    <TableHead>Harga/Satuan</TableHead>
                    <TableHead>Total Nilai</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => {
                    const status = getStockStatus(material);
                    const totalValue = material.current_stock * material.unit_price;

                    return (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">
                          <div className="max-w-xs break-words whitespace-normal leading-normal">
                            {material.name}
                          </div>
                        </TableCell>
                        <TableCell>{material.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{material.current_stock} {material.unit}</span>
                            {status.status === "low" && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{material.min_stock} {material.unit}</TableCell>
                        <TableCell>Rp {material.unit_price.toLocaleString("id-ID")}</TableCell>
                        <TableCell>Rp {totalValue.toLocaleString("id-ID")}</TableCell>
                        <TableCell>
                          <Badge variant={status.color as "default" | "secondary" | "destructive" | "outline"}>
                            {status.text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Stok Menipis</CardTitle>
              <CardDescription>Bahan yang perlu segera diisi ulang</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length > 0 ? (
                <div className="space-y-4">
                  {lowStockItems.map((material) => {
                    const needed = material.min_stock - material.current_stock;

                    return (
                      <Card key={material.id} className="border-red-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{material.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                SKU: {material.sku} | Satuan: {material.unit}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm">Stok: {material.current_stock} {material.unit}</span>
                                <span className="text-sm">Minimum: {material.min_stock} {material.unit}</span>
                                <Badge variant="destructive">
                                  Butuh {Math.abs(needed)} {material.unit} lagi
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">Rp {material.unit_price.toLocaleString("id-ID")}/{material.unit}</p>
                              <p className="text-sm text-muted-foreground">
                                Total: Rp {(Math.abs(needed) * material.unit_price).toLocaleString("id-ID")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>✨ Semua stok dalam kondisi baik!</p>
                  <p className="text-sm mt-2">Tidak ada bahan yang stoknya menipis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pergerakan Stok</CardTitle>
              <CardDescription>50 transaksi stok terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Bahan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Sisa Stok</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>
                        {new Date(history.created_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(history.type)}
                          <span>{getTypeLabel(history.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {history.materials?.name || history.products?.name || "-"}
                        {history.materials && (
                          <div className="text-xs text-muted-foreground">
                            {history.materials.unit}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={history.type === "in" ? "text-green-600" : "text-red-600"}>
                        {history.type === "in" ? "+" : "-"}{history.quantity}
                      </TableCell>
                      <TableCell>{history.remaining_stock}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {history.reference_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {history.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}