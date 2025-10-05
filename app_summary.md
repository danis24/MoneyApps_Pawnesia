📌 Ringkasan Aplikasi Manajemen Bisnis & Penjualan Multi-Channel
1. Alur Utama Aplikasi

Input Data Penjualan

Shopee & TikTok: Import otomatis via API (multi-shop, user pilih dropdown toko).

Offline: Input manual atau upload file Excel/CSV.

Sistem akan merekap semua penjualan menjadi satu tabel transaksi.

Manajemen Produk & HPP

Produk didefinisikan sekali (nama, SKU, kategori).

HPP dihitung berdasarkan komposisi bahan (misalnya: kalung kucing = webbing + buckle + lonceng).

Saat ada penjualan, sistem otomatis mengurangi stok bahan baku sesuai komposisi.

Stok Barang & Gudang

Barang masuk: tambah stok bahan/produk jadi.

Barang keluar: terpakai untuk produksi/penjualan.

Tracking real-time: terlihat stok bahan mentah & stok produk jadi.

Keuangan & Cashflow

Pemasukan: dari penjualan (Shopee, TikTok, offline).

Pengeluaran: gaji, kasbon, belanja bahan, biaya iklan, dll.

Hutang & piutang tercatat terpisah.

Dashboard cashflow → posisi keuangan harian, mingguan, bulanan.

Penggajian Karyawan

Bisa harian, mingguan, bulanan.

Fitur kasbon: dicatat & dipotong otomatis dari gaji.

Slip gaji otomatis (PDF atau tampilan di aplikasi).

Analisis & AI Assistant

Analisis penjualan: produk paling laku, profit terbesar, ROI iklan.

Rekomendasi stok: bahan apa yang harus dibeli ulang.

Evaluasi iklan per produk: apakah iklan efektif atau boros.

AI memberikan insight → “Produk A bagus, tingkatkan stok + iklan”, atau “Produk B rugi, pertimbangkan stop iklan”.

Laporan & Dashboard

Laba Rugi: otomatis berdasarkan penjualan – HPP – biaya lain.

Cashflow: posisi kas masuk/keluar.

Stock Report: bahan mentah & produk jadi.

Multi Shop Report: performa tiap toko (Shopee A, Shopee B, TikTok, offline).

Bisa diexport ke Excel/PDF untuk laporan keuangan.

2. Fitur Utama

🔹 Multi Channel Sales: Shopee, TikTok, Offline (multi shop support).

🔹 Product & BOM (Bill of Materials): produk punya resep bahan → stok otomatis berkurang.

🔹 Stock Management: real-time stok bahan + produk.

🔹 Finance & Cashflow: pemasukan, pengeluaran, hutang/piutang, kasbon.

🔹 Payroll System: gaji karyawan harian/mingguan/bulanan, slip otomatis.

🔹 Shopee/TikTok Import: via API (penjualan, iklan, biaya).

🔹 AI Decision Support: rekomendasi produk laku, evaluasi iklan, analisis profit.

🔹 Dashboard & Reports: laba rugi, cashflow, stock, penjualan multi toko.

3. Alur Data Singkat

User input/otomatis import penjualan → tersimpan di Supabase.

Sistem mapping produk → bahan → stok berkurang otomatis.

Finance service menghitung laba rugi, cashflow, gaji, hutang/piutang.

AI service membaca data → beri insight & rekomendasi.

Dashboard menampilkan semua hasil → bisa diexport.