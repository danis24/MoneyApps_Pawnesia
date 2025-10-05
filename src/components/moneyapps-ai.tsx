"use client";

import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bot, User, TrendingUp, Package, DollarSign, Lightbulb, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";

interface BusinessInsight {
  type: 'stock' | 'sales' | 'financial' | 'marketing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
}

interface BusinessData {
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
  total_amount: number;
  created_at: string;
}

interface MaterialData {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  unit_price: number;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

interface FinanceData {
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
}

export default function MoneyAppsAI() {
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [businessData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    isLoading: chatLoading,
  } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
    },
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content: `👋 Halo! Saya adalah AI Assistant untuk MoneyApps. Saya bisa membantu Anda:

📊 **Analisis Bisnis:**
- Analisis performa penjualan per produk/channel
- Rekomendasi harga dan strategi pricing
- Prediksi kebutuhan stok bahan baku
- Identifikasi produk yang paling menguntungkan

💰 **Keuangan & Cashflow:**
- Analisis laba rugi dan cash flow
- Rekomendasi pengelolaan biaya
- Tips untuk meningkatkan profit margin
- Optimasi pengeluaran operasional

📦 **Manajemen Stok:**
- Alert stok menipis dan rekomendasi pembelian
- Analisis konsumsi bahan baku
- Optimasi tingkat stok untuk menghindari kehabisan/kelebihan
- Prediksi kebutuhan stok berdasarkan trend penjualan

🎯 **Marketing & Iklan:**
- Evaluasi efektivitas iklan
- Rekomendasi produk untuk dipromosikan
- Analisis ROI per channel marketing
- Strategi pricing untuk kompetitif

Tanyakan apa saja tentang bisnis Anda!`,
      },
    ],
  });

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  // Business data fetching with client-side auth
  useEffect(() => {
    if (isSignedIn && user) {
      fetchBusinessData();
    }
  }, [isSignedIn, user]);

  const fetchBusinessData = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch business metrics for AI insights
      const [
        salesData,
        materialsData,
        productsData,
        financeData
      ] = await Promise.all([
        authSupabase
          .from("sales")
          .select("total_amount, created_at, shops!inner(name, channel)")
          .eq("user_id", user?.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),

        authSupabase
          .from("materials")
          .select("id, name, current_stock, min_stock, unit, unit_price")
          .eq("user_id", user?.id),

        authSupabase
          .from("products")
          .select("id, name, price, is_active")
          .eq("user_id", user?.id)
          .eq("is_active", true),

        authSupabase
          .from("transactions")
          .select("amount, type, created_at, finance_categories!inner(name)")
          .eq("user_id", user?.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      // Generate insights
      const generatedInsights = generateInsights({
        sales: salesData.data || [],
        materials: materialsData.data || [],
        products: productsData.data || [],
        finance: financeData.data || [],
      });

      setInsights(generatedInsights);
    } catch (error) {
      console.error("Error fetching business data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (data: {
    sales: SalesData[];
    materials: MaterialData[];
    products: ProductData[];
    finance: FinanceData[];
  }): BusinessInsight[] => {
    const insights: BusinessInsight[] = [];

    // Stock insights
    const lowStockItems = data.materials?.filter((m: MaterialData) => m.current_stock <= m.min_stock) || [];
    if (lowStockItems.length > 0) {
      insights.push({
        type: 'stock',
        priority: 'high',
        title: 'Stok Menipis',
        description: `${lowStockItems.length} bahan stoknya menipis`,
        action: 'Segera lakukan pembelian untuk menghindari kehabisan stok',
        impact: 'Mencegah terhentinya produksi'
      });
    }

    // Sales insights
    const totalSales = data.sales?.reduce((sum: number, s: SalesData) => sum + s.total_amount, 0) || 0;
    if (totalSales > 0) {
      insights.push({
        type: 'sales',
        priority: 'medium',
        title: 'Analisis Penjualan',
        description: `Total penjualan 30 hari: Rp ${totalSales.toLocaleString('id-ID')}`,
        action: 'Analisis produk mana yang paling laku dan mana yang perlu dipromosikan',
        impact: 'Optimasi strategi penjualan dan marketing'
      });
    }

    // Financial insights
    const income = data.finance?.filter((f: FinanceData) => f.type === 'income').reduce((sum: number, f: FinanceData) => sum + f.amount, 0) || 0;
    const expenses = data.finance?.filter((f: FinanceData) => f.type === 'expense').reduce((sum: number, f: FinanceData) => sum + f.amount, 0) || 0;
    const profit = income - expenses;

    if (profit < 0) {
      insights.push({
        type: 'financial',
        priority: 'high',
        title: 'Kerugian Finansial',
        description: `Rugi bulan ini: Rp ${Math.abs(profit).toLocaleString('id-ID')}`,
        action: 'Review pengeluaran dan tingkatkan penjualan',
        impact: 'Mengembalikan profitabilitas bisnis'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }).slice(0, 5);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'stock': return <Package className="h-5 w-5" />;
      case 'sales': return <TrendingUp className="h-5 w-5" />;
      case 'financial': return <DollarSign className="h-5 w-5" />;
      case 'marketing': return <Target className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const quickActions = [
    {
      title: "Analisis Performa",
      prompt: "Analisis performa bisnis saya 30 hari terakhir, berikan insight tentang produk terlaris, profit margin, dan rekomendasi untuk meningkatkan penjualan.",
      icon: TrendingUp
    },
    {
      title: "Rekomendasi Stok",
      prompt: "Berdasarkan data stok saat ini, berikan rekomendasi bahan apa saja yang perlu segera dibeli dan berapa jumlahnya untuk optimasi produksi.",
      icon: Package
    },
    {
      title: "Optimasi Keuangan",
      prompt: "Analisis cash flow saya dan berikan tips untuk mengoptimalkan pengeluaran, meningkatkan profit, dan mengelola hutang piutang dengan lebih baik.",
      icon: DollarSign
    },
    {
      title: "Strategi Marketing",
      prompt: "Beri strategi marketing yang efektif untuk produk saya, rekomendasikan channel mana yang paling potensial dan bagaimana meningkatkan ROI iklan.",
      icon: Target
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Bot className="h-6 w-6" />
          AI Business Assistant
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Dapatkan insight dan rekomendasi untuk optimasi bisnis Anda
        </p>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-700 dark:text-red-300 text-sm">
              {error.message || "An error occurred while processing your request."}
            </span>
          </div>
        </Card>
      )}

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="insights">Business Insights</TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Insights & Rekomendasi
                </CardTitle>
                <CardDescription>
                  Analisis otomatis berdasarkan data bisnis Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.length > 0 ? (
                    insights.map((insight, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getInsightIcon(insight.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{insight.title}</h3>
                              <Badge variant={getPriorityColor(insight.priority) as "default" | "secondary" | "destructive" | "outline"}>
                                {insight.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {insight.description}
                            </p>
                            <div className="text-xs">
                              <div className="font-medium">Aksi:</div>
                              <div>{insight.action}</div>
                              <div className="font-medium mt-1">Dampak:</div>
                              <div>{insight.impact}</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>✨ Semua berjalan baik!</p>
                      <p className="text-sm mt-2">Tidak ada insight yang perlu perhatian khusus</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Tanyakan langsung ke AI untuk analisis spesifik
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start text-left"
                      onClick={() => {
                        // This would typically set the input and submit
                        const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
                        if (textarea) {
                          textarea.value = action.prompt;
                          textarea.dispatchEvent(new Event('input', { bubbles: true }));
                          const form = textarea.closest('form');
                          if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true }));
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <action.icon className="h-4 w-4" />
                        <span className="font-medium">{action.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {action.prompt.substring(0, 80)}...
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <div className="flex flex-col w-full max-w-4xl mx-auto">
            <div className="space-y-4 mb-4 min-h-[400px] max-h-[600px] overflow-y-auto">
              {messages.length === 1 ? ( // Only the initial message
                <Card className="p-6 text-center border-dashed">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Siap membantu analisis bisnis Anda!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gunakan quick actions atau tanyakan langsung tentang performa bisnis, stok, keuangan, atau strategi marketing.
                  </p>
                </Card>
              ) : (
                messages.map((m) => (
                  <Card key={m.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {m.role === "user" ? (
                        <User className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-green-600" />
                      )}
                      <span className="font-semibold text-sm">
                        {m.role === "user" ? "You" : "AI Assistant"}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed pl-6">
                      {m.content}
                    </div>
                  </Card>
                ))
              )}

              {chatLoading && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-sm">AI Assistant</span>
                  </div>
                  <div className="pl-6">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                name="message"
                value={input}
                placeholder="Tanya tentang performa bisnis, stok, keuangan, atau marketing..."
                onChange={handleInputChange}
                className="flex-1"
                disabled={chatLoading}
              />
              <Button type="submit" disabled={chatLoading || !input.trim()}>
                {chatLoading ? "Sending..." : "Send"}
              </Button>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}