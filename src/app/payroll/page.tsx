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
  Users,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  CreditCard,
  Calculator,
} from "lucide-react";
import { supabase, createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/user-client";
import { useAuth } from "@clerk/nextjs";

interface Employee {
  id: string;
  name: string;
  position: string;
  phone?: string;
  address?: string;
  daily_salary: number;
  is_active: boolean;
  created_at: string;
}

interface Payroll {
  id: string;
  employee_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  base_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  status: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
  employees?: Employee;
}

interface CashAdvance {
  id: string;
  employee_id: string;
  amount: number;
  description?: string;
  is_repaid: boolean;
  payroll_id?: string;
  created_at: string;
  employees?: Employee;
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showCashAdvanceDialog, setShowCashAdvanceDialog] = useState(false);

  const { user, isSignedIn } = useCurrentUser();
  const { getToken } = useAuth();

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    position: "",
    phone: "",
    address: "",
    daily_salary: "",
  });

  const [payrollForm, setPayrollForm] = useState({
    employee_id: "",
    period_type: "monthly",
    period_start: "",
    period_end: "",
    base_salary: "",
    bonus: "0",
    deduction: "0",
    notes: "",
  });

  const [cashAdvanceForm, setCashAdvanceForm] = useState({
    employee_id: "",
    amount: "",
    description: "",
  });

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

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

      // Fetch employees
      const { data: employeesData } = await authSupabase
        .from("employees")
        .select("*")
        .eq("user_id", user?.id)
        .order("name");

      // Fetch payrolls
      const { data: payrollsData } = await authSupabase
        .from("payroll")
        .select(`
          *,
          employees (
            name,
            position
          )
        `)
        .eq("user_id", user?.id)
        .order("period_start", { ascending: false });

      // Fetch cash advances
      const { data: cashAdvancesData } = await authSupabase
        .from("cash_advances")
        .select(`
          *,
          employees (
            name,
            position
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_repaid", false)
        .order("created_at", { ascending: false });

      setEmployees(employeesData || []);
      setPayrolls(payrollsData || []);
      setCashAdvances(cashAdvancesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmployee = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      if (editingEmployee) {
        const { error } = await authSupabase
          .from("employees")
          .update({
            name: employeeForm.name,
            position: employeeForm.position,
            phone: employeeForm.phone || null,
            address: employeeForm.address || null,
            daily_salary: parseFloat(employeeForm.daily_salary),
          })
          .eq("id", editingEmployee.id);

        if (error) throw error;
      } else {
        const { error } = await authSupabase
          .from("employees")
          .insert({
            name: employeeForm.name,
            position: employeeForm.position,
            phone: employeeForm.phone || null,
            address: employeeForm.address || null,
            daily_salary: parseFloat(employeeForm.daily_salary),
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setShowEmployeeDialog(false);
      resetEmployeeForm();
      fetchData();
    } catch (error) {
      console.error("Error saving employee:", error);
      alert("Gagal menyimpan data karyawan");
    }
  };

  const savePayroll = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("payroll")
        .insert({
          employee_id: payrollForm.employee_id,
          period_type: payrollForm.period_type,
          period_start: new Date(payrollForm.period_start).toISOString(),
          period_end: new Date(payrollForm.period_end).toISOString(),
          base_salary: parseFloat(payrollForm.base_salary),
          bonus: parseFloat(payrollForm.bonus) || 0,
          deduction: parseFloat(payrollForm.deduction) || 0,
          net_salary: parseFloat(payrollForm.base_salary) + (parseFloat(payrollForm.bonus) || 0) - (parseFloat(payrollForm.deduction) || 0),
          notes: payrollForm.notes || null,
          user_id: user?.id,
        });

      if (error) throw error;

      setShowPayrollDialog(false);
      resetPayrollForm();
      fetchData();
    } catch (error) {
      console.error("Error saving payroll:", error);
      alert("Gagal menyimpan penggajian");
    }
  };

  const saveCashAdvance = async () => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("cash_advances")
        .insert({
          employee_id: cashAdvanceForm.employee_id,
          amount: parseFloat(cashAdvanceForm.amount),
          description: cashAdvanceForm.description || null,
          user_id: user?.id,
        });

      if (error) throw error;

      setShowCashAdvanceDialog(false);
      resetCashAdvanceForm();
      fetchData();
    } catch (error) {
      console.error("Error saving cash advance:", error);
      alert("Gagal menyimpan kasbon");
    }
  };

  const markAsPaid = async (payrollId: string) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      const { error } = await authSupabase
        .from("payroll")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
        })
        .eq("id", payrollId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Gagal menandai sebagai dibayar");
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: "",
      position: "",
      phone: "",
      address: "",
      daily_salary: "",
    });
    setEditingEmployee(null);
  };

  const resetPayrollForm = () => {
    setPayrollForm({
      employee_id: "",
      period_type: "monthly",
      period_start: "",
      period_end: "",
      base_salary: "",
      bonus: "0",
      deduction: "0",
      notes: "",
    });
  };

  const resetCashAdvanceForm = () => {
    setCashAdvanceForm({
      employee_id: "",
      amount: "",
      description: "",
    });
  };

  const editEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      position: employee.position,
      phone: employee.phone || "",
      address: employee.address || "",
      daily_salary: employee.daily_salary.toString(),
    });
    setShowEmployeeDialog(true);
  };

  const getTotalUnpaidCashAdvances = () => {
    return cashAdvances.reduce((total, advance) => total + advance.amount, 0);
  };

  const getPendingPayrolls = () => {
    return payrolls.filter(payroll => payroll.status === "pending");
  };

  const getPeriodTypeLabel = (type: string) => {
    switch (type) {
      case "daily": return "Harian";
      case "weekly": return "Mingguan";
      case "monthly": return "Bulanan";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Dibayar</Badge>;
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            Silakan masuk untuk mengakses halaman penggajian
          </p>
        </div>
      </div>
    );
  }

  const totalUnpaidCashAdvances = getTotalUnpaidCashAdvances();
  const pendingPayrolls = getPendingPayrolls();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Penggajian & Kasbon
          </h1>
          <p className="text-muted-foreground mt-2">
            Manajemen gaji karyawan dan kasbon
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter(e => e.is_active).length}</div>
            <p className="text-xs text-muted-foreground">Karyawan aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gaji Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayrolls.length}</div>
            <p className="text-xs text-muted-foreground">Menunggu pembayaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kasbon</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rp {totalUnpaidCashAdvances.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">Belum dilunasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gaji Bulan Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {pendingPayrolls.reduce((total, p) => total + p.net_salary, 0).toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">Yang harus dibayar</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">Karyawan</TabsTrigger>
          <TabsTrigger value="payroll">Penggajian</TabsTrigger>
          <TabsTrigger value="kasbon">Kasbon</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daftar Karyawan</CardTitle>
                  <CardDescription>Data karyawan aktif</CardDescription>
                </div>
                <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetEmployeeForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Karyawan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingEmployee ? "Edit Karyawan" : "Tambah Karyawan Baru"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingEmployee ? "Edit data karyawan" : "Tambah karyawan baru"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                          id="name"
                          value={employeeForm.name}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                          placeholder="Nama karyawan"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position">Posisi/Jabatan</Label>
                        <Input
                          id="position"
                          value={employeeForm.position}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                          placeholder="Posisi atau jabatan"
                        />
                      </div>
                      <div>
                        <Label htmlFor="daily-salary">Gaji Harian (Rp)</Label>
                        <Input
                          id="daily-salary"
                          type="number"
                          value={employeeForm.daily_salary}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, daily_salary: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">No. Telepon</Label>
                        <Input
                          id="phone"
                          value={employeeForm.phone}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                          placeholder="Opsional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Alamat</Label>
                        <Input
                          id="address"
                          value={employeeForm.address}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                          placeholder="Opsional"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveEmployee} className="flex-1">
                          {editingEmployee ? "Update" : "Simpan"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Gaji Harian</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>Rp {employee.daily_salary.toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        {employee.phone && (
                          <div className="text-sm">{employee.phone}</div>
                        )}
                        {employee.address && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {employee.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editEmployee(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Riwayat Penggajian</CardTitle>
                  <CardDescription>Data penggajian karyawan</CardDescription>
                </div>
                <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetPayrollForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Buat Penggajian
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Buat Penggajian Baru</DialogTitle>
                      <DialogDescription>Hitung dan buat penggajian untuk karyawan</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="employee">Karyawan</Label>
                        <Select
                          value={payrollForm.employee_id}
                          onValueChange={(value) => setPayrollForm({ ...payrollForm, employee_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih karyawan" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="period-type">Periode</Label>
                        <Select
                          value={payrollForm.period_type}
                          onValueChange={(value) => setPayrollForm({ ...payrollForm, period_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Harian</SelectItem>
                            <SelectItem value="weekly">Mingguan</SelectItem>
                            <SelectItem value="monthly">Bulanan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="period-start">Tanggal Mulai</Label>
                          <Input
                            id="period-start"
                            type="date"
                            value={payrollForm.period_start}
                            onChange={(e) => setPayrollForm({ ...payrollForm, period_start: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="period-end">Tanggal Selesai</Label>
                          <Input
                            id="period-end"
                            type="date"
                            value={payrollForm.period_end}
                            onChange={(e) => setPayrollForm({ ...payrollForm, period_end: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="base-salary">Gaji Pokok (Rp)</Label>
                        <Input
                          id="base-salary"
                          type="number"
                          value={payrollForm.base_salary}
                          onChange={(e) => setPayrollForm({ ...payrollForm, base_salary: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bonus">Bonus (Rp)</Label>
                          <Input
                            id="bonus"
                            type="number"
                            value={payrollForm.bonus}
                            onChange={(e) => setPayrollForm({ ...payrollForm, bonus: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="deduction">Potongan (Rp)</Label>
                          <Input
                            id="deduction"
                            type="number"
                            value={payrollForm.deduction}
                            onChange={(e) => setPayrollForm({ ...payrollForm, deduction: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="payroll-notes">Catatan</Label>
                        <Input
                          id="payroll-notes"
                          value={payrollForm.notes}
                          onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
                          placeholder="Opsional"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={savePayroll} className="flex-1">Simpan</Button>
                        <Button variant="outline" onClick={() => setShowPayrollDialog(false)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Potongan</TableHead>
                    <TableHead>Net Gaji</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">
                        {payroll.employees?.name}
                        <div className="text-sm text-muted-foreground">
                          {payroll.employees?.position}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getPeriodTypeLabel(payroll.period_type)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payroll.period_start).toLocaleDateString("id-ID")} -{" "}
                          {new Date(payroll.period_end).toLocaleDateString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>Rp {payroll.base_salary.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-green-600">
                        {payroll.bonus > 0 ? `+Rp ${payroll.bonus.toLocaleString("id-ID")}` : "-"}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {payroll.deduction > 0 ? `-Rp ${payroll.deduction.toLocaleString("id-ID")}` : "-"}
                      </TableCell>
                      <TableCell className="font-bold">
                        Rp {payroll.net_salary.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        {payroll.status === "pending" && (
                          <Button size="sm" onClick={() => markAsPaid(payroll.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Bayar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kasbon">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daftar Kasbon</CardTitle>
                  <CardDescription>Kasbon yang belum dilunasi</CardDescription>
                </div>
                <Dialog open={showCashAdvanceDialog} onOpenChange={setShowCashAdvanceDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetCashAdvanceForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Kasbon
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Kasbon</DialogTitle>
                      <DialogDescription>Beri kasbon kepada karyawan</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="kasbon-employee">Karyawan</Label>
                        <Select
                          value={cashAdvanceForm.employee_id}
                          onValueChange={(value) => setCashAdvanceForm({ ...cashAdvanceForm, employee_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih karyawan" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="kasbon-amount">Jumlah (Rp)</Label>
                        <Input
                          id="kasbon-amount"
                          type="number"
                          value={cashAdvanceForm.amount}
                          onChange={(e) => setCashAdvanceForm({ ...cashAdvanceForm, amount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="kasbon-desc">Deskripsi</Label>
                        <Input
                          id="kasbon-desc"
                          value={cashAdvanceForm.description}
                          onChange={(e) => setCashAdvanceForm({ ...cashAdvanceForm, description: e.target.value })}
                          placeholder="Alasan kasbon"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveCashAdvance} className="flex-1">Simpan</Button>
                        <Button variant="outline" onClick={() => setShowCashAdvanceDialog(false)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {cashAdvances.length > 0 ? (
                <div className="space-y-4">
                  {cashAdvances.map((advance) => (
                    <Card key={advance.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{advance.employees?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {advance.employees?.position}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm">
                                Tanggal: {new Date(advance.created_at).toLocaleDateString("id-ID")}
                              </span>
                              {advance.description && (
                                <span className="text-sm">{advance.description}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-red-600">
                              Rp {advance.amount.toLocaleString("id-ID")}
                            </p>
                            <Badge variant="outline">Belum Lunas</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>✨ Tidak ada kasbon!</p>
                  <p className="text-sm mt-2">Semua kasbon sudah dilunasi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}