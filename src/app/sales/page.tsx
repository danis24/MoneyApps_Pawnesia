"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Store,
  Eye,
  FileText,
  Download,
  Upload,
  } from "lucide-react";
import * as XLSX from 'xlsx';
import { createSupabaseClientWithAuth } from "@/lib/supabase-client";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";

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

interface Material {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  type: "Jasa" | "Bahan";
  created_at: string;
}

interface SalesOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  city: string;
  province: string;
  product_name: string;
  sku: string;
  variation: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  shipping_fee: number;
  shipping_cost: number;
  total_payment: number;
  net_income: number;
  operational_cost: number;
  final_income: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  payment_method: string;
  order_date: string;
  payment_date: string;
  shipping_deadline: string;
  resi_number: string;
  notes: string;
  shop_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface ShopeeOrderData {
  'No. Pesanan': string;
  'Status Pesanan': string;
  'Status Pembatalan/ Pengembalian': string;
  'No. Resi': string;
  'Opsi Pengiriman': string;
  'Antar ke counter/ pick-up': string;
  'Pesanan Harus Dikirimkan Sebelum (Menghindari keterlambatan)': string;
  'Waktu Pengiriman Diatur': string;
  'Waktu Pesanan Dibuat': string;
  'Waktu Pembayaran Dilakukan': string;
  'Metode Pembayaran': string;
  'SKU Induk': string;
  'Nama Produk': string;
  'Nomor Referensi SKU': string;
  'Nama Variasi': string;
  'Harga Awal': number;
  'Harga Setelah Diskon': number;
  'Jumlah': number;
  'Returned quantity': number;
  'Total Harga Produk': number;
  'Total Diskon': number;
  'Diskon Dari Penjual': number;
  'Diskon Dari Shopee': number;
  'Berat Produk': string;
  'Jumlah Produk di Pesan': number;
  'Total Berat': string;
  'Voucher Ditanggung Penjual': number;
  'Cashback Koin': number;
  'Voucher Ditanggung Shopee': number;
  'Paket Diskon': string;
  'Paket Diskon (Diskon dari Shopee)': number;
  'Paket Diskon (Diskon dari Penjual)': number;
  'Potongan Koin Shopee': number;
  'Diskon Kartu Kredit': number;
  'Ongkos Kirim Dibayar oleh Pembeli': number;
  'Estimasi Potongan Biaya Pengiriman': number;
  'Ongkos Kirim Pengembalian Barang': number;
  'Total Pembayaran': number;
  'Perkiraan Ongkos Kirim': number;
  'Catatan dari Pembeli': string;
  'Catatan': string;
  'Username (Pembeli)': string;
  'Nama Penerima': string;
  'No. Telepon': string;
  'Alamat Pengiriman': string;
  'Kota/Kabupaten': string;
  'Provinsi': string;
  'Waktu Pesanan Selesai': string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShop, setSelectedShop] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Import states
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [previewData, setPreviewData] = useState<ShopeeOrderData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  // Progress states
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    status: '',
    isProcessing: false
  });

  // Reset import states
  const resetImportStates = () => {
    setImporting(false);
    setShowPreview(false);
    setPreviewData([]);
    setProcessingOrder(null);
    setImportProgress({
      current: 0,
      total: 0,
      percentage: 0,
      status: '',
      isProcessing: false
    });
  };

  // Detail view states
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Handle view detail
  const handleViewDetail = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailDialog(true);
  };

  // Handle print/export transaction
  const handlePrintTransaction = (transaction: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Detail Transaksi - ${transaction.reference}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .total { font-size: 18px; font-weight: bold; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Detail Transaksi</h1>
            <h2>${transaction.reference}</h2>
          </div>

          <div class="section">
            <div class="grid">
              <div>
                <div class="label">Tipe</div>
                <div class="value">${transaction.type === 'manual' ? 'Manual' : 'Shopee'}</div>
              </div>
              <div>
                <div class="label">Tanggal</div>
                <div class="value">${new Date(transaction.date).toLocaleDateString('id-ID')}</div>
              </div>
              <div>
                <div class="label">Toko</div>
                <div class="value">${transaction.shop}</div>
              </div>
              <div>
                <div class="label">Channel</div>
                <div class="value">${transaction.channel}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="label">Pelanggan</div>
            <div class="value">${transaction.customer || '-'}</div>
            ${transaction.type === 'manual' && (transaction.originalData as Sale).customer_phone ?
              `<div class="value">Telepon: ${(transaction.originalData as Sale).customer_phone}</div>` : ''}
            ${transaction.type === 'shopee' && (transaction.originalData as SalesOrder).customer_phone ?
              `<div class="value">Telepon: ${(transaction.originalData as SalesOrder).customer_phone}</div>` : ''}
          </div>

          ${transaction.type === 'shopee' ? `
          <div class="section">
            <div class="label">Produk</div>
            <div class="value">${(transaction.originalData as SalesOrder).product_name}</div>
            <div class="value">SKU: ${(transaction.originalData as SalesOrder).sku}</div>
            ${(transaction.originalData as SalesOrder).variation ?
              `<div class="value">Variasi: ${(transaction.originalData as SalesOrder).variation}</div>` : ''}
            <div class="value">Jumlah: ${(transaction.originalData as SalesOrder).quantity}</div>
          </div>
          ` : ''}

          <div class="section">
            <div class="grid">
              <div>
                <div class="label">Total</div>
                <div class="value">Rp ${transaction.total.toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div class="label">Net Revenue</div>
                <div class="value total">Rp ${transaction.net.toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>

          ${transaction.status ? `
          <div class="section">
            <div class="label">Status</div>
            <div class="value">${transaction.status}</div>
          </div>
          ` : ''}

          ${transaction.type === 'shopee' && (transaction.originalData as SalesOrder).resi_number ? `
          <div class="section">
            <div class="label">No. Resi</div>
            <div class="value">${(transaction.originalData as SalesOrder).resi_number}</div>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // Shop and material selection states
  const [selectedShopForImport, setSelectedShopForImport] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<{[key: string]: number}>({});
  const [showMaterialSettings, setShowMaterialSettings] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState("all"); // "all", "manual", "shopee"

  const { getToken } = useAuth();
  const { user } = useUser();

  // Helper function for status badge variants
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'default';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

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

      // Fetch materials for operational costs
      const { data: materialsData } = await authSupabase
        .from("materials")
        .select("id, name, unit, current_stock, unit_cost")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("name");

      // Fetch Shopee sales orders
      const { data: salesOrdersData } = await authSupabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", user?.id)
        .order("order_date", { ascending: false });

      setSales(salesData || []);
      setSalesOrders(salesOrdersData || []);
      setShops(shopsData || []);
      setMaterials(materialsData || []);

      // Initialize selected materials with default costs
      const initialMaterialCosts: {[key: string]: number} = {};
      materialsData?.forEach(material => {
        initialMaterialCosts[material.id] = material.unit_cost || 0;
      });
      setSelectedMaterials(initialMaterialCosts);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Combine and filter all transactions
  const getFilteredTransactions = () => {
    let allTransactions: Array<{
      type: 'manual' | 'shopee';
      id: string;
      reference: string;
      shop: string;
      channel: string;
      customer: string;
      date: string;
      total: number;
      net: number;
      status?: string;
      originalData: Sale | SalesOrder;
    }> = [];

    // Add manual sales
    const filteredManualSales = sales.filter((sale) => {
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

    filteredManualSales.forEach((sale) => {
      allTransactions.push({
        type: 'manual',
        id: sale.id,
        reference: sale.invoice_number,
        shop: sale.shops[0]?.name || '',
        channel: sale.shops[0]?.channel || '',
        customer: sale.customer_name || '',
        date: sale.sale_date,
        total: sale.total_amount,
        net: sale.total_amount - sale.platform_fee,
        originalData: sale
      });
    });

    // Add Shopee orders
    const filteredShopeeOrders = salesOrders.filter((order) => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = () => {
        if (dateFilter === "all") return true;
        const orderDate = new Date(order.order_date);
        const today = new Date();
        switch (dateFilter) {
          case "today":
            return orderDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= weekAgo;
          case "month":
            return orderDate.getMonth() === today.getMonth() &&
                   orderDate.getFullYear() === today.getFullYear();
          default:
            return true;
        }
      };

      return matchesSearch && matchesDate();
    });

    filteredShopeeOrders.forEach((order) => {
      allTransactions.push({
        type: 'shopee',
        id: order.id,
        reference: order.order_number,
        shop: 'Shopee',
        channel: 'shopee',
        customer: order.customer_name,
        date: order.order_date,
        total: order.total_payment,
        net: order.final_income,
        status: order.status,
        originalData: order
      });
    });

    // Apply type filter
    if (filterType !== "all") {
      allTransactions = allTransactions.filter(t => t.type === filterType);
    }

    // Sort by date (newest first)
    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredTransactions = getFilteredTransactions();

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedShop, dateFilter, filterType, itemsPerPage]);

  const calculateTotals = () => {
    return filteredTransactions.reduce(
      (totals, transaction) => ({
        totalSales: totals.totalSales + transaction.total,
        platformFees: totals.platformFees + (transaction.type === 'manual' ?
          (transaction.originalData as Sale).platform_fee : 0),
        shippingFees: totals.shippingFees + (transaction.type === 'manual' ?
          (transaction.originalData as Sale).shipping_fee :
          (transaction.originalData as SalesOrder).shipping_fee),
        netRevenue: totals.netRevenue + transaction.net,
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

  // Import Shopee functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readExcelFile(file);
    }
  };

  const readExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ShopeeOrderData>(worksheet);

        setPreviewData(jsonData);
        setShowPreview(true);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        alert("Error reading Excel file. Please check the file format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Helper function to clean price format (9.399 -> 9399)
  const cleanPriceFormat = (price: string | number | null | undefined): number => {
    if (!price) return 0;

    // Convert to string and remove dots
    const priceString = String(price).replace(/\./g, '');

    // Parse to float
    const parsedPrice = parseFloat(priceString);

    return isNaN(parsedPrice) ? 0 : parsedPrice;
  };

  // Extract variation from product name
  const extractVariation = (productName: string): string => {
    if (!productName) return '';

    // Common variation patterns in Shopee
    const patterns = [
      /,\s*([^,]+)$/, // Last comma separated value
      /\|\s*([^|]+)$/, // Last pipe separated value
      /\s*-\s*([^-\s]+)$/, // Last dash separated value
      /([A-Z]+[^A-Z\s]*)$/i // Capitalized words at end
    ];

    for (const pattern of patterns) {
      const match = productName.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  };

  // Calculate operational cost based on materials
  const calculateOperationalCost = () => {
    return Object.values(selectedMaterials).reduce((total, cost) => total + cost, 0);
  };

  const processShopeeOrder = async (orderData: ShopeeOrderData) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Calculate values with proper price formatting
      const shippingFee = cleanPriceFormat(orderData['Ongkos Kirim Dibayar oleh Pembeli']);
      const shippingCost = cleanPriceFormat(orderData['Estimasi Potongan Biaya Pengiriman']);
      const totalPayment = cleanPriceFormat(orderData['Total Pembayaran']);
      const unitPrice = cleanPriceFormat(orderData['Harga Per Satuan (Setelah Diskon)'] || orderData['Harga Per Satuan']);
      const operationalCostPerOrder = calculateOperationalCost();

      // Note: net_income and final_income are calculated automatically by database as generated columns

      // Extract variation from product name
      const variation = extractVariation(orderData['Nama Produk']);

      
      // Determine status
      let status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
      switch (orderData['Status Pesanan']) {
        case 'Perlu Dikirim':
          status = 'pending';
          break;
        case 'Dikirim':
          status = 'shipped';
          break;
        case 'Selesai':
          status = 'completed';
          break;
        case 'Dibatalkan':
          status = 'cancelled';
          break;
        default:
          status = 'pending';
      }

      // Check if order already exists
      console.log("Checking for existing order:", orderData['No. Pesanan']);
      let existingOrder = null;
      let checkError = null;

      try {
        const result = await authSupabase
          .from("sales_orders")
          .select("id")
          .eq("order_number", orderData['No. Pesanan'])
          .eq("user_id", user?.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116

        existingOrder = result.data;
        checkError = result.error;
      } catch (err) {
        console.error("Exception when checking existing order:", err);
        throw new Error("Database connection error when checking existing order");
      }

      if (checkError) {
        console.error("Error checking existing order:", checkError);

        // If table doesn't exist, show a helpful error
        if (checkError.code === '42P01') { // undefined_table
          throw new Error("The sales_orders table doesn't exist. Please run the database migration first.");
        }
      }

      if (existingOrder) {
        // Update existing order
        const { error } = await authSupabase
          .from("sales_orders")
          .update({
            status,
            resi_number: orderData['No. Resi'],
            shipping_deadline: orderData['Pesanan Harus Dikirimkan Sebelum (Menghindari keterlambatan)'] ? new Date(orderData['Pesanan Harus Dikirimkan Sebelum (Menghindari keterlambatan)']).toISOString() : null,
            total_payment: totalPayment,
            shipping_fee: shippingFee,
            shipping_cost: shippingCost,
            operational_cost: operationalCostPerOrder,
            variation: variation,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOrder.id);

        if (error) throw error;
      } else {
        // Insert new order
        console.log("Inserting new order:", orderData['No. Pesanan']);
        const { error } = await authSupabase
          .from("sales_orders")
          .insert({
            order_number: orderData['No. Pesanan'],
            customer_name: orderData['Nama Penerima'],
            customer_phone: orderData['No. Telepon'],
            address: orderData['Alamat Pengiriman'],
            city: orderData['Kota/Kabupaten'],
            province: orderData['Provinsi'],
            product_name: orderData['Nama Produk'],
            sku: orderData['SKU Induk'],
            variation: variation, // Use extracted variation
            quantity: parseInt(orderData['Jumlah']) || 1,
            unit_price: unitPrice, // Use cleaned price
            total_price: cleanPriceFormat(orderData['Total Harga Produk']), // Use cleaned price
            shipping_fee: shippingFee,
            shipping_cost: shippingCost,
            total_payment: totalPayment, // Use cleaned price
            operational_cost: operationalCostPerOrder,
            status,
            payment_method: orderData['Metode Pembayaran'],
            order_date: new Date(orderData['Waktu Pesanan Dibuat']).toISOString(),
            payment_date: orderData['Waktu Pembayaran Dilakukan'] ? new Date(orderData['Waktu Pembayaran Dilakukan']).toISOString() : null,
            shipping_deadline: orderData['Pesanan Harus Dikirimkan Sebelum (Menghindari keterlambatan)'] ? new Date(orderData['Pesanan Harus Dikirimkan Sebelum (Menghindari keterlambatan)']).toISOString() : null,
            resi_number: orderData['No. Resi'],
            notes: orderData['Catatan dari Pembeli'],
            user_id: user?.id,
            shop_id: null, // Remove shop_id reference since it expects UUID
          });

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }

        console.log("Order inserted successfully:", orderData['No. Pesanan']);

        // Reduce stock if order is not cancelled
        if (status !== 'cancelled') {
          await reduceProductStock(orderData['SKU Induk'], orderData['Jumlah']);
        }
      }

      return { success: true, orderNumber: orderData['No. Pesanan'] };
    } catch (error) {
      console.error("Error processing order:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      return { success: false, orderNumber: orderData['No. Pesanan'], error: error.message || 'Unknown error' };
    }
  };

  const reduceProductStock = async (sku: string, quantity: number) => {
    try {
      const token = await getToken();
      const authSupabase = createSupabaseClientWithAuth(token);

      // Find the product and its BOM
      let product = null;
      try {
        const result = await authSupabase
          .from("products")
          .select("id, name, bill_of_materials")
          .eq("sku", sku)
          .eq("user_id", user?.id)
          .maybeSingle(); // Use maybeSingle to avoid errors if product not found

        product = result.data;
      } catch (err) {
        console.error("Error finding product for stock reduction:", err);
        return;
      }

      if (!product) {
        console.log("Product not found for stock reduction:", sku);
        return;
      }

      // Check if product has BOM data
      const billOfMaterials = product.bill_of_materials || [];
      if (!Array.isArray(billOfMaterials) || billOfMaterials.length === 0) {
        console.log("No BOM found for product:", sku);
        return;
      }

      // If product has BOM, reduce materials stock
      if (billOfMaterials.length > 0) {
        for (const bomItem of billOfMaterials) {
          const { error } = await authSupabase
            .from("materials")
            .update({
              current_stock: `current_stock - ${bomItem.quantity * quantity}`,
            })
            .eq("id", bomItem.material_id);

          if (error) throw error;

          // Add stock history
          await authSupabase
            .from("stock_history")
            .insert({
              material_id: bomItem.material_id,
              type: "out",
              quantity: bomItem.quantity * quantity,
              previous_quantity: 0, // Will be calculated by trigger
              new_quantity: 0, // Will be calculated by trigger
              reason: `Penjualan produk ${product.name} (${sku})`,
              user_id: user?.id,
              shop_id: user?.id,
            });
        }
      }
    } catch (error) {
      console.error("Error reducing product stock:", error);
    }
  };

  const processOrders = async () => {
    if (!previewData.length) return;

    setImporting(true);
    setImportProgress({
      current: 0,
      total: previewData.length,
      percentage: 0,
      status: 'Memulai proses import...',
      isProcessing: true
    });

    const results = [];
    let successfulCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < previewData.length; i++) {
        const orderData = previewData[i];
        const orderNumber = orderData['No. Pesanan'];

        // Update progress
        const currentProgress = i + 1;
        const percentage = Math.round((currentProgress / previewData.length) * 100);

        setImportProgress(prev => ({
          ...prev,
          current: currentProgress,
          percentage: percentage,
          status: `Memproses pesanan ${orderNumber}...`
        }));

        const result = await processShopeeOrder(orderData);
        results.push(result);

        if (result.success) {
          successfulCount++;
        } else {
          failedCount++;
        }

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final progress update
      setImportProgress(prev => ({
        ...prev,
        percentage: 100,
        status: 'Import selesai!'
      }));

      // Show results
      const totalRevenue = results
        .filter(result => result.success)
        .reduce((sum, result) => {
          const orderData = previewData.find(o => o['No. Pesanan'] === result.orderNumber);
          return sum + cleanPriceFormat(orderData?.['Total Pembayaran'] || 0);
        }, 0);

      alert(
        `Import selesai!\n\n` +
        `Berhasil: ${successfulCount} pesanan\n` +
        `Gagal: ${failedCount} pesanan\n\n` +
        `Total pendapatan bersih: Rp ${totalRevenue.toLocaleString('id-ID')}`
      );

      // Refresh data
      await fetchData();
      resetImportStates();
      setShowImportDialog(false);
    } catch (error) {
      console.error("Error processing orders:", error);
      alert("Error processing orders. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Referensi",
      "Tipe",
      "Toko",
      "Channel",
      "Pelanggan",
      "Tanggal",
      "Total",
      "Net Revenue",
      "Status"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map(transaction => [
        transaction.reference,
        transaction.type === 'manual' ? 'Manual' : 'Shopee',
        `"${transaction.shop}"`,
        transaction.channel,
        `"${transaction.customer}"`,
        new Date(transaction.date).toLocaleDateString("id-ID"),
        transaction.total,
        transaction.net,
        transaction.status || (transaction.type === 'manual' ? (transaction.originalData as Sale).payment_status : '')
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `transaksi_${new Date().toISOString().split('T')[0]}.csv`);
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
          <Dialog
            open={showImportDialog}
            onOpenChange={(open) => {
              if (!open) {
                resetImportStates();
              }
              setShowImportDialog(open);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Shopee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Data Penjualan Shopee</DialogTitle>
                <DialogDescription>
                  Upload file Excel export dari Shopee untuk mengimport data penjualan
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shop">Pilih Toko</Label>
                  <Select value={selectedShopForImport} onValueChange={setSelectedShopForImport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih toko untuk import" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name} ({shop.channel})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label>Pengaturan Biaya Operasional</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMaterialSettings(!showMaterialSettings)}
                      >
                        {showMaterialSettings ? "Sembunyikan" : "Tampilkan"} Detail
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Biaya operasional dihitung per paket order, bukan per item
                    </p>
                  </div>

                  {!showMaterialSettings ? (
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <div className="text-sm font-medium">
                        Total Biaya Operasional per Paket: Rp {calculateOperationalCost().toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Klik &quot;Tampilkan Detail&quot; untuk mengatur biaya material per paket order
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-4">
                      <h4 className="font-medium text-sm">Atur Biaya Material per Paket Order</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {materials.map((material) => (
                          <div key={material.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{material.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Stok: {material.current_stock} {material.unit} |
                                Harga: Rp {material.unit_cost?.toLocaleString('id-ID') || 0}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={selectedMaterials[material.id] || 0}
                                onChange={(e) => setSelectedMaterials(prev => ({
                                  ...prev,
                                  [material.id]: Number(e.target.value) || 0
                                }))}
                                placeholder="Biaya per paket"
                                className="w-24 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">per paket</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total per Paket:</span>
                          <span className="font-bold text-lg">
                            Rp {calculateOperationalCost().toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="file">File Excel Shopee</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={!selectedShopForImport || importing || importProgress.isProcessing}
                  />
                  {!selectedShopForImport && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Silakan pilih toko terlebih dahulu
                    </p>
                  )}
                </div>

                {showPreview && previewData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Preview Data</h3>
                      <Badge variant="secondary">{previewData.length} pesanan</Badge>
                    </div>

                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No. Pesanan</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(0, 10).map((order, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{order['No. Pesanan']}</TableCell>
                              <TableCell>{order['Nama Produk']}</TableCell>
                              <TableCell>{order['Jumlah']}</TableCell>
                              <TableCell>Rp {cleanPriceFormat(order['Total Pembayaran']).toLocaleString('id-ID')}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{order['Status Pesanan']}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {previewData.length > 10 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          ... dan {previewData.length - 10} pesanan lainnya
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={processOrders}
                        disabled={importing || importProgress.isProcessing}
                        className="min-w-32"
                      >
                        {importing || importProgress.isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Importing...
                          </div>
                        ) : (
                          'Import Semua'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPreview(false);
                          resetImportStates();
                        }}
                        disabled={importing || importProgress.isProcessing}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}

                {importProgress.isProcessing && (
                  <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progress Import</span>
                      <span className="text-sm font-bold">{importProgress.percentage}%</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.percentage}%` }}
                      ></div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Memproses: {importProgress.current} / {importProgress.total} pesanan</p>
                      <p>Status: {importProgress.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type Transaksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Transaksi</SelectItem>
                <SelectItem value="manual">Penjualan Manual</SelectItem>
                <SelectItem value="shopee">Pesanan Shopee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Item per halaman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / halaman</SelectItem>
                <SelectItem value="50">50 / halaman</SelectItem>
                <SelectItem value="100">100 / halaman</SelectItem>
                <SelectItem value="500">500 / halaman</SelectItem>
                <SelectItem value="1000">1000 / halaman</SelectItem>
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
            Menampilkan {paginatedTransactions.length} dari {filteredTransactions.length} transaksi (Halaman {currentPage} dari {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedTransactions.length > 0 ? (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Toko & Channel</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {transaction.reference}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'manual' ? 'default' : 'secondary'}>
                        {transaction.type === 'manual' ? 'Manual' : 'Shopee'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getChannelIcon(transaction.channel)}</span>
                        <div>
                          <div className="font-medium">{transaction.shop}</div>
                          <Badge variant="outline" className="text-xs">
                            {transaction.channel}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.customer || "-"}
                      {transaction.type === 'manual' && (transaction.originalData as Sale).customer_phone && (
                        <div className="text-sm text-muted-foreground">
                          {(transaction.originalData as Sale).customer_phone}
                        </div>
                      )}
                      {transaction.type === 'shopee' && (transaction.originalData as SalesOrder).customer_phone && (
                        <div className="text-sm text-muted-foreground">
                          {(transaction.originalData as SalesOrder).customer_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {transaction.total.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-green-600 font-medium">
                        Rp {transaction.net.toLocaleString("id-ID")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.status && (
                        <Badge variant={getStatusVariant(transaction.status)}>
                          {transaction.status === 'pending' && 'Menunggu'}
                          {transaction.status === 'processing' && 'Diproses'}
                          {transaction.status === 'shipped' && 'Dikirim'}
                          {transaction.status === 'completed' && 'Selesai'}
                          {transaction.status === 'cancelled' && 'Dibatalkan'}
                        </Badge>
                      )}
                      {transaction.type === 'manual' && (transaction.originalData as Sale).payment_status && (
                        <Badge variant="outline" className="ml-1">
                          {(transaction.originalData as Sale).payment_status === 'completed' && 'Lunas'}
                          {(transaction.originalData as Sale).payment_status === 'pending' && 'Menunggu'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetail(transaction)}
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintTransaction(transaction)}
                          title="Cetak/Export"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-10 h-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada transaksi yang ditemukan</p>
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

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang transaksi ini
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Referensi</div>
                  <div className="font-semibold text-lg">{selectedTransaction.reference}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tipe Transaksi</div>
                  <Badge variant={selectedTransaction.type === 'manual' ? 'default' : 'secondary'}>
                    {selectedTransaction.type === 'manual' ? 'Manual' : 'Shopee'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tanggal</div>
                  <div>{new Date(selectedTransaction.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Toko & Channel</div>
                  <div className="flex items-center gap-2">
                    <span>{getChannelIcon(selectedTransaction.channel)}</span>
                    <div>
                      <div className="font-medium">{selectedTransaction.shop}</div>
                      <Badge variant="outline" className="text-xs">
                        {selectedTransaction.channel}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Informasi Pelanggan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Nama Pelanggan</div>
                    <div className="font-medium">{selectedTransaction.customer || '-'}</div>
                  </div>
                  {selectedTransaction.type === 'manual' && (selectedTransaction.originalData as Sale).customer_phone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Telepon</div>
                      <div>{(selectedTransaction.originalData as Sale).customer_phone}</div>
                    </div>
                  )}
                  {selectedTransaction.type === 'shopee' && (selectedTransaction.originalData as SalesOrder).customer_phone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Telepon</div>
                      <div>{(selectedTransaction.originalData as SalesOrder).customer_phone}</div>
                    </div>
                  )}
                  {selectedTransaction.type === 'shopee' && (selectedTransaction.originalData as SalesOrder).address && (
                    <>
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">Alamat</div>
                        <div>{(selectedTransaction.originalData as SalesOrder).address}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Kota</div>
                        <div>{(selectedTransaction.originalData as SalesOrder).city}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Provinsi</div>
                        <div>{(selectedTransaction.originalData as SalesOrder).province}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Product Information (Shopee only) */}
              {selectedTransaction.type === 'shopee' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Informasi Produk</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Nama Produk</div>
                      <div className="font-medium">{(selectedTransaction.originalData as SalesOrder).product_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">SKU</div>
                      <div>{(selectedTransaction.originalData as SalesOrder).sku}</div>
                    </div>
                    {(selectedTransaction.originalData as SalesOrder).variation && (
                      <div>
                        <div className="text-sm text-muted-foreground">Variasi</div>
                        <div>{(selectedTransaction.originalData as SalesOrder).variation}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-muted-foreground">Jumlah</div>
                      <div>{(selectedTransaction.originalData as SalesOrder).quantity} pcs</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Harga Satuan</div>
                      <div>Rp {(selectedTransaction.originalData as SalesOrder).unit_price.toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Informasi Keuangan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pembayaran</div>
                    <div className="font-semibold">Rp {selectedTransaction.total.toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Net Revenue</div>
                    <div className="font-semibold text-green-600">Rp {selectedTransaction.net.toLocaleString('id-ID')}</div>
                  </div>

                  {selectedTransaction.type === 'manual' && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Platform Fee</div>
                        <div className="text-red-600">- Rp {(selectedTransaction.originalData as Sale).platform_fee.toLocaleString('id-ID')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Shipping Fee</div>
                        <div className="text-green-600">+ Rp {(selectedTransaction.originalData as Sale).shipping_fee.toLocaleString('id-ID')}</div>
                      </div>
                    </>
                  )}

                  {selectedTransaction.type === 'shopee' && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Shipping Fee</div>
                        <div className="text-green-600">+ Rp {(selectedTransaction.originalData as SalesOrder).shipping_fee.toLocaleString('id-ID')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Shipping Cost</div>
                        <div className="text-red-600">- Rp {(selectedTransaction.originalData as SalesOrder).shipping_cost.toLocaleString('id-ID')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Operational Cost</div>
                        <div className="text-red-600">- Rp {(selectedTransaction.originalData as SalesOrder).operational_cost.toLocaleString('id-ID')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Net Income</div>
                        <div className="font-medium">Rp {(selectedTransaction.originalData as SalesOrder).net_income.toLocaleString('id-ID')}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status and Payment Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Status & Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  {selectedTransaction.status && (
                    <div>
                      <div className="text-sm text-muted-foreground">Status Pesanan</div>
                      <Badge variant={getStatusVariant(selectedTransaction.status)}>
                        {selectedTransaction.status === 'pending' && 'Menunggu'}
                        {selectedTransaction.status === 'processing' && 'Diproses'}
                        {selectedTransaction.status === 'shipped' && 'Dikirim'}
                        {selectedTransaction.status === 'completed' && 'Selesai'}
                        {selectedTransaction.status === 'cancelled' && 'Dibatalkan'}
                      </Badge>
                    </div>
                  )}

                  {selectedTransaction.type === 'manual' && (selectedTransaction.originalData as Sale).payment_status && (
                    <div>
                      <div className="text-sm text-muted-foreground">Status Pembayaran</div>
                      <Badge variant="outline">
                        {(selectedTransaction.originalData as Sale).payment_status === 'completed' && 'Lunas'}
                        {(selectedTransaction.originalData as Sale).payment_status === 'pending' && 'Menunggu'}
                      </Badge>
                    </div>
                  )}

                  {selectedTransaction.type === 'shopee' && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Metode Pembayaran</div>
                        <div>{(selectedTransaction.originalData as SalesOrder).payment_method || '-'}</div>
                      </div>
                      {(selectedTransaction.originalData as SalesOrder).payment_date && (
                        <div>
                          <div className="text-sm text-muted-foreground">Tanggal Pembayaran</div>
                          <div>{new Date((selectedTransaction.originalData as SalesOrder).payment_date).toLocaleDateString('id-ID')}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Shipping Information (Shopee only) */}
              {selectedTransaction.type === 'shopee' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Informasi Pengiriman</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    {(selectedTransaction.originalData as SalesOrder).resi_number && (
                      <div>
                        <div className="text-sm text-muted-foreground">No. Resi</div>
                        <div className="font-mono">{(selectedTransaction.originalData as SalesOrder).resi_number}</div>
                      </div>
                    )}
                    {(selectedTransaction.originalData as SalesOrder).shipping_deadline && (
                      <div>
                        <div className="text-sm text-muted-foreground">Deadline Pengiriman</div>
                        <div>{new Date((selectedTransaction.originalData as SalesOrder).shipping_deadline).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(selectedTransaction.type === 'manual' && (selectedTransaction.originalData as Sale).notes) ||
               (selectedTransaction.type === 'shopee' && (selectedTransaction.originalData as SalesOrder).notes) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Catatan</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="whitespace-pre-wrap">
                      {selectedTransaction.type === 'manual'
                        ? (selectedTransaction.originalData as Sale).notes
                        : (selectedTransaction.originalData as SalesOrder).notes
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Tutup
                </Button>
                <Button onClick={() => handlePrintTransaction(selectedTransaction)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Cetak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}