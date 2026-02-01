'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function PurchaseImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 1. FONCTION DE TÉLÉCHARGEMENT DU MODÈLE ---
  const downloadTemplate = () => {
    const templateData = [
      {
        temp_id: 'PO-2024-001',
        partner_id: 15, // ID du fournisseur
        date_order: '2024-01-15 10:00:00', // Format texte recommandé
        product_id: 50, // ID produit Odoo
        qty: 10,
        price_unit: 500.0,
        tax_id: 1, // ID Taxe (optionnel)
        currency_id: 1, // ID Devise (optionnel)
        company_id: 1 // ID Société (optionnel)
      },
      {
        temp_id: 'PO-2024-001', // Même temp_id = Même commande (2ème ligne)
        partner_id: 15,
        date_order: '2024-01-15 10:00:00',
        product_id: 52,
        qty: 5,
        price_unit: 50.0,
        tax_id: 1,
        currency_id: 1,
        company_id: 1
      },
      {
        temp_id: 'PO-2024-002', // Nouvelle commande
        partner_id: 20,
        date_order: '2024-02-01 14:30:00',
        product_id: 60,
        qty: 2,
        price_unit: 1200.0,
        tax_id: '',
        currency_id: 1,
        company_id: 1
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modele Achats");
    XLSX.writeFile(wb, "modele_import_achats.xlsx");
  };

  // --- 2. UTILITAIRE DATE EXCEL ---
  const formatExcelDate = (input: any) => {
    try {
      if (!input) return new Date().toISOString().slice(0, 19).replace('T', ' ');
      let dateObj: Date;
      // Si Excel envoie un nombre (ex: 45678)
      if (typeof input === 'number') {
        dateObj = new Date(Math.round((input - 25569) * 86400 * 1000));
      } else {
        dateObj = new Date(input);
      }
      if (isNaN(dateObj.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
      return dateObj.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setFile(e.target.files[0]);
        setLogs([]); // Reset des logs
    }
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setLogs(["Lecture du fichier..."]);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        let rows: any[] = [];

        // Lecture universelle (Excel ou CSV)
        if (file.name.endsWith('.csv')) {
             const workbook = XLSX.read(data, { type: 'binary' });
             const sheetName = workbook.SheetNames[0];
             rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
             const workbook = XLSX.read(data, { type: 'array' });
             const sheetName = workbook.SheetNames[0];
             rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        setLogs(prev => [...prev, `${rows.length} lignes brutes trouvées.`]);
        
        // --- ALGORITHME DE REGROUPEMENT (GROUP BY temp_id) ---
        const groupedOrders = new Map();

        rows.forEach((row, index) => {
            // Validation des champs requis
            if (!row.temp_id || !row.partner_id || !row.product_id) {
                // On loggue un avertissement seulement si ce n'est pas une ligne vide
                if (Object.keys(row).length > 0) {
                    console.warn(`Ligne ${index + 2} ignorée (données manquantes)`, row);
                }
                return;
            }

            if (!groupedOrders.has(row.temp_id)) {
                // Utilisation de formatExcelDate pour éviter les erreurs de date
                const formattedDate = formatExcelDate(row.date_order);

                groupedOrders.set(row.temp_id, {
                    temp_id: row.temp_id,
                    partner_id: row.partner_id,
                    date: formattedDate,
                    currency_id: row.currency_id,
                    company_id: row.company_id, // Ajout du support company_id
                    lines: []
                });
            }

            const order = groupedOrders.get(row.temp_id);
            order.lines.push({
                product_id: row.product_id,
                qty: row.qty || 1,
                price_unit: row.price_unit || 0,
                tax_id: row.tax_id || null
            });
        });

        const payload = Array.from(groupedOrders.values());
        setLogs(prev => [...prev, `${payload.length} commandes d'achat identifiées.`]);
        
        // Envoi au Backend
        setLogs(prev => [...prev, "Envoi vers Odoo en cours..."]);
        
        const res = await fetch('/api/odoo-test/purchases/import', {
            method: 'POST',
            body: JSON.stringify({ orders: payload }),
        });

        const result = await res.json();

        if (res.ok) {
            setLogs(prev => [...prev, `✅ SUCCÈS : ${result.success} achats créés.`]);
            if (result.failed > 0) {
                setLogs(prev => [...prev, `❌ ÉCHECS : ${result.failed} erreurs.`]);
                setLogs(prev => [...prev, ...result.errors]);
            }
        } else {
            setLogs(prev => [...prev, `ERREUR API : ${result.error}`]);
        }

      } catch (err: any) {
        setLogs(prev => [...prev, `ERREUR CRITIQUE : ${err.message}`]);
      } finally {
        setLoading(false);
      }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsBinaryString(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Import Achats (Excel/CSV)</h1>
          
          <div className="flex gap-4">
            {/* BOUTON TELECHARGEMENT */}
            <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Modèle Excel
            </button>

            <Link href="/purchases" className="bg-blue-100 text-blue-700 px-4 py-2 rounded text-sm font-bold hover:bg-blue-200 transition flex items-center">
                ← Retour
            </Link>
          </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border space-y-6">
        
        {/* Instructions */}
        <div className="bg-orange-50 p-4 rounded text-sm text-orange-800 border border-orange-200">
            <p className="font-bold mb-2">Structure du fichier :</p>
            <div className="grid grid-cols-2 gap-4">
                <ul className="list-disc pl-5 space-y-1">
                    <li><code className="bg-white px-1 font-bold">temp_id</code> (ex: PO-001)</li>
                    <li><code className="bg-white px-1 font-bold">partner_id</code> (ID Fournisseur)</li>
                    <li><code className="bg-white px-1 font-bold">product_id</code> (ID Produit)</li>
                    <li><code className="bg-white px-1">date_order</code> (YYYY-MM-DD HH:mm:ss)</li>
                </ul>
                <ul className="list-disc pl-5 space-y-1">
                    <li><code className="bg-white px-1">qty</code> (Quantité)</li>
                    <li><code className="bg-white px-1">price_unit</code> (Prix d'achat)</li>
                    <li><code className="bg-white px-1">tax_id</code> (Optionnel)</li>
                    <li><code className="bg-white px-1">company_id</code> (Optionnel)</li>
                </ul>
            </div>
        </div>

        {/* Input Zone */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
            <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100 mb-4 cursor-pointer"
            />
            
            <button 
                onClick={processFile}
                disabled={!file || loading}
                className="bg-blue-600 disabled:bg-gray-300 text-white px-8 py-3 rounded font-bold shadow hover:bg-blue-700 transition w-full md:w-auto"
            >
                {loading ? 'Traitement en cours...' : 'Importer les Achats'}
            </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-xs shadow-inner">
            {logs.length === 0 && <span className="text-gray-600">// Prêt...</span>}
            {logs.map((log, i) => (
                <div key={i} className="border-b border-gray-800 py-1">{log}</div>
            ))}
        </div>

      </div>
    </div>
  );
}