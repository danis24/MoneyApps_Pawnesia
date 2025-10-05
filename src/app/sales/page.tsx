"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Store,
  Eye,
  FileText,
  Download,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

interface Sale {
  id: string;
  invoice_number: string;
  shops: Array<{
    name: string;
    channel: string;
    id: string;
  }>;
  customer_name: string;
  customer_phone: string;
  sale_date: string;
  total_amount: number;
  platform_fee: number;
  shipping_fee: number;
  notes: string;
  created_at: string;
}

interface Shop {
  id: string;
  name: string;
  channel: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShop, setSelectedShop] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      if (!user) return;

      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Fetch sales with shop details
      const { data: salesData } = await authSupabase
        .from("sales")
        .select(`
          *,
          shops (
            name,
            channel
          )
        `)
        .eq("user_id", user?.id)
        .order("sale_date", { ascending: false });

      // Fetch shops for filter
      const { data: shopsData } = await authSupabase
        .from("shops")
        .select("id, name, channel")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      setSales(salesData || []);
      setShops(shopsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    if (!sale.shops || sale.shops.length === 0) return false;

    const shopData = sale.shops[0];
    const matchesSearch =
      sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shopData.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesShop = selectedShop === "all" || shopData.id === selectedShop;

    const matchesDate = () => {
      if (dateFilter === "all") return true;

      const saleDate = new Date(sale.sale_date);
      const today = new Date();

      switch (dateFilter) {
        case "today":
          return saleDate.toDateString() === today.toDateString();
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        case "month":
          return saleDate.getMonth() === today.getMonth() &&
                 saleDate.getFullYear() === today.getFullYear();
        default:
          return true;
      }
    };

    return matchesSearch && matchesShop && matchesDate();
  });

  const calculateTotals = () => {
    return filteredSales.reduce(
      (totals, sale) => ({
        totalSales: totals.totalSales + sale.total_amount,
        platformFees: totals.platformFees + sale.platform_fee,
        shippingFees: totals.shippingFees + sale.shipping_fee,
        netRevenue: totals.netRevenue + (sale.total_amount - sale.platform_fee),
        count: totals.count + 1,
      }),
      {
        totalSales: 0,
        platformFees: 0,
        shippingFees: 0,
        netRevenue: 0,
        count: 0,
      }
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "shopee":
        return "🟠";
      case "tiktok":
        return "⚫";
      case "offline":
        return "🏪";
      default:
        return "📦";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Invoice",
      "Toko",
      "Channel",
      "Pelanggan",
      "Tanggal",
      "Total",
      "Fee Platform",
      "Ongkir",
      "Net Revenue"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredSales.map(sale => [
        sale.invoice_number,
        `"${sale.shops[0]?.name}"`,
        sale.shops[0]?.channel,
        `"${sale.customer_name || ""}"`,
        new Date(sale.sale_date).toLocaleDateString("id-ID"),
        sale.total_amount,
        sale.platform_fee,
        sale.shipping_fee,
        sale.total_amount - sale.platform_fee
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `penjualan_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Daftar Penjualan
          </h1>
          <p className="text-muted-foreground mt-2">
            Riwayat penjualan dari semua channel
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Link href="/sales/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Penjualan Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totals.totalSales.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">{totals.count} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Platform</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">- Rp {totals.platformFees.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">Total biaya platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongkos Kirim</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+ Rp {totals.shippingFees.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">Total ongkir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rp {totals.netRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">Pendapatan bersih</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari invoice, pelanggan, toko..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by toko" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Toko</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name} ({shop.channel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tanggal</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>
            Menampilkan {filteredSales.length} dari {sales.length} transaksi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Toko & Channel</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getChannelIcon(sale.shops[0]?.channel)}</span>
                        <div>
                          <div className="font-medium">{sale.shops[0]?.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {sale.shops[0]?.channel}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.customer_name || "-"}
                      {sale.customer_phone && (
                        <div className="text-sm text-muted-foreground">
                          {sale.customer_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {sale.total_amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-green-600 font-medium">
                        Rp {(sale.total_amount - sale.platform_fee).toLocaleString("id-ID")}
                      </div>
                      {sale.platform_fee > 0 && (
                        <div className="text-xs text-red-500">
                          - Rp {sale.platform_fee.toLocaleString("id-ID")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada penjualan yang ditemukan</p>
              <p className="text-sm mt-2">
                Coba ubah filter atau tambahkan penjualan baru
              </p>
              <Link href="/sales/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Penjualan
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}