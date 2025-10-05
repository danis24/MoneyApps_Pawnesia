"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";

interface DashboardData {
  totalSales: number;
  totalProducts: number;
  totalMaterials: number;
  totalEmployees: number;
  netProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  inventoryValue: number;
  lowStockItems: number;
  pendingPayrolls: number;
  unpaidCashAdvances: number;
}

interface SalesData {
  daily: Array<{ date: string; amount: number }>;
  weekly: Array<{ date: string; amount: number }>;
  monthly: Array<{ date: string; amount: number }>;
}

interface TopProducts {
  id: string;
  name: string;
  total_sold: number;
  total_revenue: number;
  profit: number;
}

interface ShopPerformance {
  id: string;
  name: string;
  channel: string;
  total_sales: number;
  total_revenue: number;
  total_transactions: number;
}

interface ProfitLoss {
  period: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
}

interface SaleItemData {
  quantity: number;
  unit_price: number;
  product: Array<{
    id: string;
    name: string;
    price: number;
  }> | null;
}

interface SaleData {
  sale_items: Array<SaleItemData>;
}

interface ShopSaleData {
  total_amount: number;
  shop: Array<{
    id: string;
    name: string;
    channel: string;
  }> | null;
}

export default function ReportsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalProducts: 0,
    totalMaterials: 0,
    totalEmployees: 0,
    netProfit: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    inventoryValue: 0,
    lowStockItems: 0,
    pendingPayrolls: 0,
    unpaidCashAdvances: 0,
  });

  const [salesData, setSalesData] = useState<SalesData>({
    daily: [],
    weekly: [],
    monthly: [],
  });

  const [topProducts, setTopProducts] = useState<TopProducts[]>([]);
  const [shopPerformance, setShopPerformance] = useState<ShopPerformance[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn && user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [dateRange, isSignedIn, user]);

  const fetchDashboardData = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Fetch basic counts
      const [
        { count: productsCount },
        { count: materialsCount },
        { count: employeesCount },
        { count: salesCount }
      ] = await Promise.all([
        authSupabase.from("products").select("*", { count: "exact", head: true }).eq("user_id", user?.id).eq("is_active", true),
        authSupabase.from("materials").select("*", { count: "exact", head: true }).eq("user_id", user?.id),
        authSupabase.from("employees").select("*", { count: "exact", head: true }).eq("user_id", user?.id).eq("is_active", true),
        authSupabase.from("sales").select("*", { count: "exact", head: true }).eq("user_id", user?.id),
      ]);

      // Fetch financial data
      const now = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }

      const [salesData, financeData, materialsData, payrollData, cashAdvancesData] = await Promise.all([
        // Sales data
        authSupabase
          .from("sales")
          .select("total_amount, created_at")
          .eq("user_id", user?.id)
          .gte("created_at", startDate.toISOString()),

        // Finance transactions
        authSupabase
          .from("transactions")
          .select("amount, type, created_at")
          .eq("user_id", user?.id)
          .gte("created_at", startDate.toISOString()),

        // Materials with stock info
        authSupabase
          .from("materials")
          .select("current_stock, min_stock, unit_price")
          .eq("user_id", user?.id),

        // Pending payrolls
        authSupabase
          .from("payroll")
          .select("net_salary, status")
          .eq("user_id", user?.id)
          .eq("status", "pending"),

        // Unpaid cash advances
        authSupabase
          .from("cash_advances")
          .select("amount")
          .eq("user_id", user?.id)
          .eq("is_repaid", false),
      ]);

      // Calculate metrics
      const totalRevenue = financeData.data
        ?.filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      const totalExpenses = financeData.data
        ?.filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      const inventoryValue = materialsData.data
        ?.reduce((sum: number, m: any) => sum + (m.current_stock * m.unit_price), 0) || 0;

      const lowStockItems = materialsData.data
        ?.filter((m: any) => m.current_stock <= m.min_stock).length || 0;

      const pendingPayrollAmount = payrollData.data
        ?.reduce((sum: number, p: any) => sum + p.net_salary, 0) || 0;

      const unpaidCashAdvancesAmount = cashAdvancesData.data
        ?.reduce((sum: number, ca: any) => sum + ca.amount, 0) || 0;

      setDashboardData({
        totalSales: salesCount || 0,
        totalProducts: productsCount || 0,
        totalMaterials: materialsCount || 0,
        totalEmployees: employeesCount || 0,
        netProfit: totalRevenue - totalExpenses,
        totalRevenue,
        totalExpenses,
        inventoryValue,
        lowStockItems,
        pendingPayrolls: payrollData.data?.length || 0,
        unpaidCashAdvances: unpaidCashAdvancesAmount,
      });

      // Generate sales trend data
      generateSalesTrendData(salesData.data || []);

      // Fetch top products
      if (user?.id) {
        const topProductsData = await getTopProducts(user.id, startDate, now);
        setTopProducts(topProductsData);

        // Fetch shop performance
        const shopPerfData = await getShopPerformance(user.id, startDate, now);
        setShopPerformance(shopPerfData);
      }

      // Generate profit/loss data
      if (user?.id) {
        const profitLossData = await generateProfitLossData(user.id);
        setProfitLoss(profitLossData);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSalesTrendData = (sales: Array<{ total_amount: number; created_at: string }>) => {
    const now = new Date();

    // Daily data (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySales = sales
        .filter(s => s.created_at.startsWith(dateStr))
        .reduce((sum, s) => sum + s.total_amount, 0);

      dailyData.push({ date: dateStr, amount: daySales });
    }

    // Weekly data (last 12 weeks)
    const weeklyData = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekSales = sales
        .filter(s => {
          const saleDate = new Date(s.created_at);
          return saleDate >= weekStart && saleDate <= weekEnd;
        })
        .reduce((sum, s) => sum + s.total_amount, 0);

      weeklyData.push({
        date: `Week ${12 - i}`,
        amount: weekSales
      });
    }

    // Monthly data (last 12 months)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthSales = sales
        .filter(s => {
          const saleDate = new Date(s.created_at);
          return saleDate >= monthStart && saleDate <= monthEnd;
        })
        .reduce((sum, s) => sum + s.total_amount, 0);

      const monthName = monthStart.toLocaleDateString('id-ID', { month: 'short' });
      monthlyData.push({ date: monthName, amount: monthSales });
    }

    setSalesData({
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
    });
  };

  const getTopProducts = async (userId: string, startDate: Date, endDate: Date) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { data } = await authSupabase
        .from("sales")
        .select(`
          sale_items (
            quantity,
            unit_price,
            product:products (
              id,
              name,
              price
            )
          )
        `)
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (!data) return [];

      const productMap = new Map();

      data.forEach((sale) => {
        const saleItems = sale.sale_items;
        if (!saleItems || saleItems.length === 0) return;

        saleItems.forEach((item) => {
          const product = item.product;
          if (!product || product.length === 0) return;

          const productData = product[0];
          const totalSold = item.quantity;
          const totalRevenue = item.quantity * item.unit_price;

          if (productMap.has(productData.id)) {
            const existing = productMap.get(productData.id);
            existing.total_sold += totalSold;
            existing.total_revenue += totalRevenue;
          } else {
            productMap.set(productData.id, {
              id: productData.id,
              name: productData.name,
              total_sold: totalSold,
              total_revenue: totalRevenue,
              profit: totalRevenue * 0.3 // Simplified profit calculation
            });
          }
        });
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);
    } catch (error) {
      console.error("Error fetching top products:", error);
      return [];
    }
  };

  const getShopPerformance = async (userId: string, startDate: Date, endDate: Date) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { data } = await authSupabase
        .from("sales")
        .select(`
          total_amount,
          shop:shops (
            id,
            name,
            channel
          )
        `)
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (!data) return [];

      const shopMap = new Map();

      data.forEach((sale: ShopSaleData) => {
        const shop = sale.shop;
        if (!shop || shop.length === 0) return;

        const shopData = shop[0];
        if (shopMap.has(shopData.id)) {
          const existing = shopMap.get(shopData.id);
          existing.total_sales += 1;
          existing.total_revenue += sale.total_amount;
        } else {
          shopMap.set(shopData.id, {
            id: shopData.id,
            name: shopData.name,
            channel: shopData.channel,
            total_sales: 1,
            total_revenue: sale.total_amount,
            total_transactions: 1,
          });
        }
      });

      return Array.from(shopMap.values());
    } catch (error) {
      console.error("Error fetching shop performance:", error);
      return [];
    }
  };

  const generateProfitLossData = async (userId: string) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);
      const data: ProfitLoss[] = [];

      // Generate for last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);

        const [financeData, salesData] = await Promise.all([
          authSupabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", userId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString()),

          authSupabase
            .from("sales")
            .select("total_amount")
            .eq("user_id", userId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString()),
        ]);

        const revenue = financeData.data
          ?.filter(t => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0) || 0;

        const expenses = financeData.data
          ?.filter(t => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0) || 0;

        const salesRevenue = salesData.data
          ?.reduce((sum, s) => sum + s.total_amount, 0) || 0;

        const cogs = salesRevenue * 0.7; // Simplified COGS calculation
        const grossProfit = revenue - cogs;
        const operatingExpenses = expenses;
        const netProfit = grossProfit - operatingExpenses;

        data.push({
          period: monthStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
          revenue,
          cogs,
          gross_profit: grossProfit,
          operating_expenses: operatingExpenses,
          net_profit: netProfit,
        });
      }

      return data;
    } catch (error) {
      console.error("Error generating profit/loss data:", error);
      return [];
    }
  };

  const exportReport = (type: string) => {
    // Implement export functionality
    alert(`Exporting ${type} report...`);
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

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "shopee": return "🟠";
      case "tiktok": return "⚫";
      case "offline": return "🏪";
      default: return "📦";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Dashboard & Analisis
          </h1>
          <p className="text-muted-foreground mt-2">
            Analisis performa bisnis dan laporan keuangan
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 Hari Terakhir</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportReport("comprehensive")}>
            <Download className="h-4 w-4 mr-2" />
            Export Laporan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {dashboardData.totalRevenue.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateRange === "week" ? "7 hari terakhir" :
               dateRange === "month" ? "Bulan ini" : "Tahun ini"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rp {Math.abs(dashboardData.netProfit).toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">Net profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalSales}</div>
            <p className="text-xs text-muted-foreground">Penjualan berhasil</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Stok</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {dashboardData.inventoryValue.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.lowStockItems > 0 && (
                <span className="text-red-500">
                  {dashboardData.lowStockItems} item stok menipis
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="sales">Analisis Penjualan</TabsTrigger>
          <TabsTrigger value="products">Performa Produk</TabsTrigger>
          <TabsTrigger value="financial">Laporan Keuangan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trend Penjualan</CardTitle>
                <CardDescription>Perkembangan penjualan terkini</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.daily.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                      <span className="font-medium">Rp {day.amount.toLocaleString("id-ID")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performa Channel</CardTitle>
                <CardDescription>Perbandingan performa per toko</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shopPerformance.map((shop, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getChannelIcon(shop.channel)}</span>
                        <span className="font-medium">{shop.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">Rp {shop.total_revenue.toLocaleString("id-ID")}</div>
                        <div className="text-sm text-muted-foreground">
                          {shop.total_sales} transaksi
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Produk Terlaris</CardTitle>
                <CardDescription>10 produk dengan penjualan tertinggi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.slice(0, 10).map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.total_sold} terjual
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">Rp {product.total_revenue.toLocaleString("id-ID")}</div>
                        <div className="text-sm text-green-600">
                          Rp {product.profit.toLocaleString("id-ID")} laba
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analisis Channel</CardTitle>
                <CardDescription>Detail performa per channel penjualan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shopPerformance.map((shop, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getChannelIcon(shop.channel)}</span>
                          <span className="font-semibold">{shop.name}</span>
                        </div>
                        <Badge variant="outline">{shop.channel}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Pendapatan</div>
                          <div className="font-bold">Rp {shop.total_revenue.toLocaleString("id-ID")}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Transaksi</div>
                          <div className="font-bold">{shop.total_sales}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Analisis Produk Lengkap</CardTitle>
              <CardDescription>Performa detail semua produk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topProducts.map((product, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Terjual:</span>
                        <span>{product.total_sold} pcs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pendapatan:</span>
                        <span>Rp {product.total_revenue.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Laba:</span>
                        <span className="text-green-600">
                          Rp {product.profit.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg/Item:</span>
                        <span>
                          Rp {(product.total_revenue / product.total_sold).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Laba Rugi</CardTitle>
              <CardDescription>Perkembangan keuangan 6 bulan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Periode</th>
                      <th className="text-right p-2">Pendapatan</th>
                      <th className="text-right p-2">COGS</th>
                      <th className="text-right p-2">Laba Kotor</th>
                      <th className="text-right p-2">Operasional</th>
                      <th className="text-right p-2">Laba Bersih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitLoss.map((pl, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{pl.period}</td>
                        <td className="p-2 text-right">Rp {pl.revenue.toLocaleString("id-ID")}</td>
                        <td className="p-2 text-right">Rp {pl.cogs.toLocaleString("id-ID")}</td>
                        <td className={`p-2 text-right ${pl.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rp {Math.abs(pl.gross_profit).toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 text-right">Rp {pl.operating_expenses.toLocaleString("id-ID")}</td>
                        <td className={`p-2 text-right font-bold ${pl.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rp {Math.abs(pl.net_profit).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}