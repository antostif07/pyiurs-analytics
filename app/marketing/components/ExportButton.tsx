'use client'

import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function ExportButton({ campaignName, data }: { campaignName: string, data: any[] }) {
  
  const handleExport = () => {
    const excelRows = data.map(item => ({
        'Image URL': item.image_url,
        'HS Code': item.hs_code,
        'Désignation': item.name,
        'Code Barre': item.barcode || '',
        'Stock': item.qty_available,
        'Coût Achat': item.standard_price,
        'Prix Boutique (+25%)': item.shop_price,
        'Réduction': `-${item.discount}%`,
        'PRIX PROMO FINAL': item.promo_price
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Promo");
    XLSX.writeFile(workbook, `Campagne_${campaignName.replace(/\s/g, '_')}.xlsx`);
  };

  return (
    <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm">
        <Download size={18} /> Exporter Excel
    </button>
  );
}