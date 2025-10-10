const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path ke file export Shopee
const filePath = './Order.toship.20250924_20251009.xlsx';

try {
  console.log('Menganalisis file Shopee export...');
  console.log('File path:', path.resolve(filePath));

  // Baca file Excel
  const workbook = XLSX.readFile(filePath);

  console.log('\n=== SHEET INFO ===');
  console.log('Jumlah sheet:', workbook.SheetNames.length);
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`${index + 1}. ${sheetName}`);
  });

  // Ambil sheet pertama (biasanya data utama)
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert ke JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('\n=== STRUCTURE DATA ===');
  console.log('Jumlah baris:', jsonData.length);
  console.log('Jumlah kolom:', jsonData[0] ? jsonData[0].length : 0);

  if (jsonData.length > 0) {
    console.log('\n=== HEADER KOLOM ===');
    const headers = jsonData[0];
    headers.forEach((header, index) => {
      console.log(`${index + 1}. ${header}`);
    });

    console.log('\n=== CONTOH DATA (5 baris pertama) ===');
    for (let i = 1; i <= Math.min(5, jsonData.length - 1); i++) {
      console.log(`\nBaris ${i + 1}:`);
      const row = jsonData[i];
      if (row && row.length > 0) {
        headers.forEach((header, index) => {
          if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
            console.log(`  ${header}: ${row[index]}`);
          }
        });
      }
    }

    // Analisis kolom penting untuk sistem
    console.log('\n=== DETEKSI KOLOM PENTING ===');
    const importantColumns = [
      'order', 'pesanan', 'nomor', 'invoice', 'no',
      'produk', 'product', 'nama', 'name',
      'jumlah', 'quantity', 'qty', 'jumlah',
      'harga', 'price', 'total',
      'status', 'state',
      'tanggal', 'date', 'waktu', 'time',
      'fee', 'biaya', 'ongkir', 'ongkos', 'shipping'
    ];

    const foundColumns = [];
    headers.forEach((header, index) => {
      if (header) {
        const headerLower = header.toString().toLowerCase();
        const found = importantColumns.find(important =>
          headerLower.includes(important.toLowerCase())
        );
        if (found) {
          foundColumns.push({
            index: index + 1,
            name: header,
            category: found
          });
        }
      }
    });

    console.log('Kolom penting yang ditemukan:');
    foundColumns.forEach(col => {
      console.log(`  ${col.index}. ${col.name} -> ${col.category}`);
    });

    // Simpan hasil analisis
    const analysisResult = {
      fileName: filePath,
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      totalRows: jsonData.length,
      totalColumns: jsonData[0] ? jsonData[0].length : 0,
      headers: headers,
      sampleData: jsonData.slice(1, 6),
      importantColumns: foundColumns,
      analysisDate: new Date().toISOString()
    };

    // Simpan ke file JSON untuk referensi
    fs.writeFileSync('./shopee-export-analysis.json', JSON.stringify(analysisResult, null, 2));
    console.log('\nHasil analisis disimpan ke: shopee-export-analysis.json');
  }

} catch (error) {
  console.error('Error membaca file:', error.message);
  console.error('Stack trace:', error.stack);
}