"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  BarChart3,
  Plus,
  Brain,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

interface DashboardKPI {
  totalSales: number;
  totalProductsSold: number;
  totalMaterials: number;
  netProfit: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    created_at: string;
  }>;
}

interface Sale {
  total_amount: number;
}

interface FinanceTransaction {
  type: string;
  amount: number;
}

interface SaleItem {
  quantity: number;
}

export default function Home() {
  const [kpiData, setKpiData] = useState<DashboardKPI>({
    totalSales: 0,
    totalProductsSold: 0,
    totalMaterials: 0,
    netProfit: 0,
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  const fetchKPIData = useCallback(async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch KPI data
      const [
        salesData,
        financeData,
        materialsData,
        saleItemsData
      ] = await Promise.all([
        // Sales this month
        authSupabase
          .from("sales")
          .select("total_amount, created_at")
          .eq("user_id", user?.id)
          .gte("created_at", startOfMonth.toISOString()),

        // Finance transactions this month
        authSupabase
          .from("transactions")
          .select("amount, type, created_at")
          .eq("user_id", user?.id)
          .gte("created_at", startOfMonth.toISOString()),

        // Materials count
        authSupabase
          .from("materials")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user?.id),

        // Products sold this month
        authSupabase
          .from("sales")
          .select("sale_items(quantity)")
          .eq("user_id", user?.id)
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      // Calculate metrics
      const totalSales = salesData.data?.reduce((sum: number, sale: Sale) => sum + sale.total_amount, 0) || 0;

      const totalRevenue = financeData.data
        ?.filter((t: FinanceTransaction) => t.type === "income")
        .reduce((sum: number, t: FinanceTransaction) => sum + t.amount, 0) || 0;

      const totalExpenses = financeData.data
        ?.filter((t: FinanceTransaction) => t.type === "expense")
        .reduce((sum: number, t: FinanceTransaction) => sum + t.amount, 0) || 0;

      const totalProductsSold = saleItemsData.data?.reduce((sum: number, sale: any) => {
  return sum + (sale.sale_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0);
}, 0) || 0;
      const totalMaterials = materialsData.count || 0;

      setKpiData({
        totalSales,
        totalProductsSold,
        totalMaterials,
        netProfit: totalRevenue - totalExpenses,
        recentActivities: [],
      });

    } catch (error) {
      console.error("Error fetching KPI data:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, user?.id]);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchKPIData();

      // Set up real-time subscription
      const subscription = supabase
        .channel('dashboard-updates')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales'
          },
          () => fetchKPIData()
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions'
          },
          () => fetchKPIData()
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'materials'
          },
          () => fetchKPIData()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user, fetchKPIData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="text-center py-12 sm:py-16 px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
          <Image
            src="/codeguide-logo.png"
            alt="MoneyApps Logo"
            width={50}
            height={50}
            className="rounded-xl sm:w-[60px] sm:h-[60px]"
          />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-500 to-purple-400 bg-clip-text text-transparent font-inter">
            MoneyApps
          </h1>
        </div>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
          Sistem Manajemen Bisnis & Penjualan Multi-Channel
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-8 max-w-7xl">
        <SignedIn>
          {/* Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  Rp {kpiData.totalSales.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">Bulan ini</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produk Terjual</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.totalProductsSold}</div>
                <p className="text-xs text-muted-foreground">Total items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stok Bahan</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.totalMaterials}</div>
                <p className="text-xs text-muted-foreground">Jenis bahan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpiData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rp {Math.abs(kpiData.netProfit).toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">Bulan ini</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Input Penjualan
                </CardTitle>
                <CardDescription>
                  Tambah penjualan baru dari berbagai channel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/sales/new">
                  <Button className="w-full">Buat Penjualan Baru</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Manajemen Produk
                </CardTitle>
                <CardDescription>
                  Kelola produk dan bahan baku
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/products">
                  <Button className="w-full" variant="outline">Kelola Produk</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Laporan & Analisis
                </CardTitle>
                <CardDescription>
                  Lihat laporan penjualan dan keuangan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/reports">
                  <Button className="w-full" variant="outline">Lihat Laporan</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Dapatkan insight & rekomendasi bisnis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/ai">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Chat dengan AI
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas Terkini</CardTitle>
              <CardDescription>Transaksi dan perubahan terbaru</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Selamat datang di MoneyApps!</p>
                    <p className="text-xs text-muted-foreground">Mulai kelola bisnis Anda dengan mudah</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Baru saja</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </SignedIn>

        <SignedOut>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold mb-4">MoneyApps Siap Digunakan!</h2>
            <p className="text-muted-foreground mb-6">
              Sistem manajemen bisnis multi-channel Anda sudah terkonfigurasi.
            </p>
            <SignInButton>
              <Button size="lg">Masuk untuk Memulai</Button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>
    </div>
  );
}
