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
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CreditCard,
  Users,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";

interface FinanceTransaction {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  transaction_date: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
  finance_categories?: {
    name: string;
    type: string;
  };
}

interface FinanceCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  description?: string;
}

interface Payable {
  id: string;
  supplier_name: string;
  description: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_date?: string;
}

interface Receivable {
  id: string;
  customer_name: string;
  description: string;
  amount: number;
  due_date: string;
  is_collected: boolean;
  collected_date?: string;
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showPayableDialog, setShowPayableDialog] = useState(false);
  const [showReceivableDialog, setShowReceivableDialog] = useState(false);

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    category_id: "",
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const [payableForm, setPayableForm] = useState({
    supplier_name: "",
    description: "",
    amount: "",
    due_date: "",
  });

  const [receivableForm, setReceivableForm] = useState({
    customer_name: "",
    description: "",
    amount: "",
    due_date: "",
  });

  const [dateFilter, setDateFilter] = useState("month");

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

      // Fetch finance categories
      const { data: categoriesData } = await authSupabase
        .from("finance_categories")
        .select("*")
        .eq("user_id", user?.id)
        .order("name");

      // Fetch finance transactions
      const { data: transactionsData } = await authSupabase
        .from("transactions")
        .select(`
          *,
          finance_categories (
            name,
            type
          )
        `)
        .eq("user_id", user?.id)
        .order("transaction_date", { ascending: false })
        .limit(100);

      // Fetch payables
      const { data: payablesData } = await authSupabase
        .from("payables")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_paid", false)
        .order("due_date");

      // Fetch receivables
      const { data: receivablesData } = await authSupabase
        .from("receivables")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_collected", false)
        .order("due_date");

      setCategories(categoriesData || []);
      setTransactions(transactionsData || []);
      setPayables(payablesData || []);
      setReceivables(receivablesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTransaction = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("transactions")
        .insert({
          category_id: transactionForm.category_id,
          description: transactionForm.description,
          amount: parseFloat(transactionForm.amount),
          type: transactionForm.type,
          transaction_date: new Date(transactionForm.transaction_date).toISOString(),
          user_id: user?.id,
        });

      if (error) throw error;

      setShowTransactionDialog(false);
      setTransactionForm({
        category_id: "",
        description: "",
        amount: "",
        type: "expense",
        transaction_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Gagal menyimpan transaksi");
    }
  };

  const savePayable = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("payables")
        .insert({
          supplier_name: payableForm.supplier_name,
          description: payableForm.description,
          amount: parseFloat(payableForm.amount),
          due_date: new Date(payableForm.due_date).toISOString(),
          user_id: user?.id,
        });

      if (error) throw error;

      setShowPayableDialog(false);
      setPayableForm({
        supplier_name: "",
        description: "",
        amount: "",
        due_date: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving payable:", error);
      alert("Gagal menyimpan hutang");
    }
  };

  const saveReceivable = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("receivables")
        .insert({
          customer_name: receivableForm.customer_name,
          description: receivableForm.description,
          amount: parseFloat(receivableForm.amount),
          due_date: new Date(receivableForm.due_date).toISOString(),
          user_id: user?.id,
        });

      if (error) throw error;

      setShowReceivableDialog(false);
      setReceivableForm({
        customer_name: "",
        description: "",
        amount: "",
        due_date: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving receivable:", error);
      alert("Gagal menyimpan piutang");
    }
  };

  const markAsPaid = async (payableId: string) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("payables")
        .update({
          is_paid: true,
          paid_date: new Date().toISOString(),
        })
        .eq("id", payableId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Gagal menandai sebagai lunas");
    }
  };

  const markAsCollected = async (receivableId: string) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("receivables")
        .update({
          is_collected: true,
          collected_date: new Date().toISOString(),
        })
        .eq("id", receivableId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error marking as collected:", error);
      alert("Gagal menandai sebagai terkumpul");
    }
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    const startDate = new Date();

    switch (dateFilter) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
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
        return transactions;
    }

    return transactions.filter(transaction =>
      new Date(transaction.transaction_date) >= startDate
    );
  };

  const calculateCashflow = () => {
    const filteredTransactions = getFilteredTransactions();
    const income = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      net: income - expense,
    };
  };

  const getOverdueItems = () => {
    const now = new Date();
    const overduePayables = payables.filter(p => new Date(p.due_date) < now && !p.is_paid);
    const overdueReceivables = receivables.filter(r => new Date(r.due_date) < now && !r.is_collected);

    return {
      payables: overduePayables,
      receivables: overdueReceivables,
    };
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
            Silakan masuk untuk mengakses halaman keuangan
          </p>
        </div>
      </div>
    );
  }

  const cashflow = calculateCashflow();
  const overdue = getOverdueItems();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Keuangan & Cashflow
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitoring keuangan, cashflow, hutang piutang
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPayableDialog} onOpenChange={setShowPayableDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Tambah Hutang
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Hutang</DialogTitle>
                <DialogDescription>Catat hutang kepada supplier</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={payableForm.supplier_name}
                    onChange={(e) => setPayableForm({ ...payableForm, supplier_name: e.target.value })}
                    placeholder="Nama supplier"
                  />
                </div>
                <div>
                  <Label htmlFor="payable-desc">Deskripsi</Label>
                  <Input
                    id="payable-desc"
                    value={payableForm.description}
                    onChange={(e) => setPayableForm({ ...payableForm, description: e.target.value })}
                    placeholder="Deskripsi hutang"
                  />
                </div>
                <div>
                  <Label htmlFor="payable-amount">Jumlah (Rp)</Label>
                  <Input
                    id="payable-amount"
                    type="number"
                    value={payableForm.amount}
                    onChange={(e) => setPayableForm({ ...payableForm, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="due-date">Jatuh Tempo</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={payableForm.due_date}
                    onChange={(e) => setPayableForm({ ...payableForm, due_date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={savePayable} className="flex-1">Simpan</Button>
                  <Button variant="outline" onClick={() => setShowPayableDialog(false)}>Batal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showReceivableDialog} onOpenChange={setShowReceivableDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Tambah Piutang
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Piutang</DialogTitle>
                <DialogDescription>Catat piutang dari pelanggan</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer">Pelanggan</Label>
                  <Input
                    id="customer"
                    value={receivableForm.customer_name}
                    onChange={(e) => setReceivableForm({ ...receivableForm, customer_name: e.target.value })}
                    placeholder="Nama pelanggan"
                  />
                </div>
                <div>
                  <Label htmlFor="receivable-desc">Deskripsi</Label>
                  <Input
                    id="receivable-desc"
                    value={receivableForm.description}
                    onChange={(e) => setReceivableForm({ ...receivableForm, description: e.target.value })}
                    placeholder="Deskripsi piutang"
                  />
                </div>
                <div>
                  <Label htmlFor="receivable-amount">Jumlah (Rp)</Label>
                  <Input
                    id="receivable-amount"
                    type="number"
                    value={receivableForm.amount}
                    onChange={(e) => setReceivableForm({ ...receivableForm, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="receivable-due">Jatuh Tempo</Label>
                  <Input
                    id="receivable-due"
                    type="date"
                    value={receivableForm.due_date}
                    onChange={(e) => setReceivableForm({ ...receivableForm, due_date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveReceivable} className="flex-1">Simpan</Button>
                  <Button variant="outline" onClick={() => setShowReceivableDialog(false)}>Batal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Transaksi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Transaksi</DialogTitle>
                <DialogDescription>Catat transaksi keuangan</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Tipe</Label>
                  <Select
                    value={transactionForm.type}
                    onValueChange={(value: "income" | "expense") =>
                      setTransactionForm({ ...transactionForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={transactionForm.category_id}
                    onValueChange={(value) => setTransactionForm({ ...transactionForm, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(cat => cat.type === transactionForm.type)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    placeholder="Deskripsi transaksi"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Jumlah (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="trans-date">Tanggal</Label>
                  <Input
                    id="trans-date"
                    type="date"
                    value={transactionForm.transaction_date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveTransaction} className="flex-1">Simpan</Button>
                  <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Batal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {cashflow.income.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateFilter === "today" ? "Hari ini" :
               dateFilter === "week" ? "7 hari terakhir" :
               dateFilter === "month" ? "Bulan ini" : "Tahun ini"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rp {cashflow.expense.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateFilter === "today" ? "Hari ini" :
               dateFilter === "week" ? "7 hari terakhir" :
               dateFilter === "month" ? "Bulan ini" : "Tahun ini"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashflow Net</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cashflow.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rp {Math.abs(cashflow.net).toLocaleString("id-ID")}
              {cashflow.net >= 0 ? " (Surplus)" : " (Defisit)"}
            </div>
            <p className="text-xs text-muted-foreground">Net cashflow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hutang & Piutang</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overdue.payables.length + overdue.receivables.length}
            </div>
            <p className="text-xs text-muted-foreground">Item yang overdue</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="payables">Hutang</TabsTrigger>
          <TabsTrigger value="receivables">Piutang</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Riwayat Transaksi</CardTitle>
                  <CardDescription>Daftar transaksi keuangan</CardDescription>
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="week">7 Hari Terakhir</SelectItem>
                    <SelectItem value="month">Bulan Ini</SelectItem>
                    <SelectItem value="year">Tahun Ini</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Referensi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredTransactions().map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.transaction_date).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
                            {transaction.finance_categories?.name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={transaction.type === "income" ? "text-green-600" : "text-red-600"}>
                        {transaction.type === "income" ? "+" : "-"}
                        Rp {transaction.amount.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transaction.reference_type || "Manual"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Hutang</CardTitle>
              <CardDescription>Hutang yang belum dibayar</CardDescription>
            </CardHeader>
            <CardContent>
              {payables.length > 0 ? (
                <div className="space-y-4">
                  {payables.map((payable) => {
                    const isOverdue = new Date(payable.due_date) < new Date();

                    return (
                      <Card key={payable.id} className={isOverdue ? "border-red-200" : ""}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{payable.supplier_name}</h3>
                              <p className="text-sm text-muted-foreground">{payable.description}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm">Jatuh tempo: {new Date(payable.due_date).toLocaleDateString("id-ID")}</span>
                                {isOverdue && (
                                  <Badge variant="destructive">Overdue</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">Rp {payable.amount.toLocaleString("id-ID")}</p>
                              <Button
                                size="sm"
                                onClick={() => markAsPaid(payable.id)}
                                className="mt-2"
                              >
                                Tandai Lunas
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>✨ Tidak ada hutang!</p>
                  <p className="text-sm mt-2">Semua hutang sudah dilunasi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Piutang</CardTitle>
              <CardDescription>Piutang yang belum terkumpul</CardDescription>
            </CardHeader>
            <CardContent>
              {receivables.length > 0 ? (
                <div className="space-y-4">
                  {receivables.map((receivable) => {
                    const isOverdue = new Date(receivable.due_date) < new Date();

                    return (
                      <Card key={receivable.id} className={isOverdue ? "border-red-200" : ""}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{receivable.customer_name}</h3>
                              <p className="text-sm text-muted-foreground">{receivable.description}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm">Jatuh tempo: {new Date(receivable.due_date).toLocaleDateString("id-ID")}</span>
                                {isOverdue && (
                                  <Badge variant="destructive">Overdue</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">Rp {receivable.amount.toLocaleString("id-ID")}</p>
                              <Button
                                size="sm"
                                onClick={() => markAsCollected(receivable.id)}
                                className="mt-2"
                              >
                                Tandai Terkumpul
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>✨ Tidak ada piutang!</p>
                  <p className="text-sm mt-2">Semua piutang sudah terkumpul</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}