'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function PurchaseImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
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
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        setLogs(prev => [...prev, `${rows.length} lignes brutes trouvées.`]);
        
        // --- ALGORITHME DE REGROUPEMENT (GROUP BY temp_id) ---
        const groupedOrders = new Map();

        rows.forEach((row, index) => {
            // Validation des champs requis
            if (!row.temp_id || !row.partner_id || !row.product_id) {
                console.warn(`Ligne ${index + 2} ignorée (données manquantes)`, row);
                return;
            }

            if (!groupedOrders.has(row.temp_id)) {
                groupedOrders.set(row.temp_id, {
                    temp_id: row.temp_id,
                    partner_id: row.partner_id,
                    date: row.date_order || new Date().toISOString().slice(0, 19).replace('T', ' '),
                    currency_id: row.currency_id,
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

    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Import Achats (Excel/CSV)</h1>
          <Link href="/purchases" className="text-blue-600 hover:underline">← Retour Achats</Link>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border space-y-6">
        
        {/* Instructions */}
        <div className="bg-orange-50 p-4 rounded text-sm text-orange-800 border border-orange-200">
            <p className="font-bold mb-2">Structure du fichier :</p>
            <div className="grid grid-cols-2 gap-4">
                <ul className="list-disc pl-5 space-y-1">
                    <li><code className="bg-white px-1 font-bold">temp_id</code> (ex: PO-001)</li>
                    <li><code className="bg-white px-1 font-bold">partner_id</code> (ID Fournisseur Odoo)</li>
                    <li><code className="bg-white px-1 font-bold">product_id</code> (ID Produit Odoo)</li>
                    <li><code className="bg-white px-1">date_order</code> (YYYY-MM-DD HH:mm:ss)</li>
                </ul>
                <ul className="list-disc pl-5 space-y-1">
                    <li><code className="bg-white px-1">qty</code> (Quantité)</li>
                    <li><code className="bg-white px-1">price_unit</code> (Prix d'achat)</li>
                    <li><code className="bg-white px-1">tax_id</code> (ID Taxe optionnel)</li>
                    <li><code className="bg-white px-1">currency_id</code> (ID Devise optionnel)</li>
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