'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // --- NOUVEAU : Fonction pour télécharger le modèle ---
  const downloadTemplate = () => {
    // Données d'exemple
    const templateData = [
      {
        session_id: 1,
        temp_id: 'CMD-001',
        partner_id: 10, // ID Client (Optionnel)
        date: '2024-01-01 10:00:00',
        product_id: 50,
        qty: 2,
        price_unit: 10.0,
        payment_method_id: 1
      },
      {
        session_id: 1,
        temp_id: 'CMD-001', // Même temp_id = Même commande, 2ème produit
        partner_id: 10,
        date: '2024-01-01 10:00:00',
        product_id: 51,
        qty: 1,
        price_unit: 5.0,
        payment_method_id: 1
      },
      {
        session_id: 1,
        temp_id: 'CMD-002',
        partner_id: '', // Laisser vide pour Anonyme
        date: '2024-01-01 10:30:00',
        product_id: 50,
        qty: 1,
        price_unit: 10.0,
        payment_method_id: 1
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modele Import");
    XLSX.writeFile(wb, "modele_import_pos.xlsx");
  };
  // ----------------------------------------------------

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

        if (file.name.endsWith('.csv')) {
             const workbook = XLSX.read(data, { type: 'binary' });
             const sheetName = workbook.SheetNames[0];
             rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
             const workbook = XLSX.read(data, { type: 'array' });
             const sheetName = workbook.SheetNames[0];
             rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        setLogs(prev => [...prev, `${rows.length} lignes trouvées.`]);
        
        // ALGORITHME DE REGROUPEMENT
        const groupedOrders = new Map();

        rows.forEach((row, index) => {
            if (!row.session_id || !row.temp_id || !row.product_id) {
                console.warn(`Ligne ${index + 2} ignorée : données manquantes`, row);
                return;
            }

            if (!groupedOrders.has(row.temp_id)) {
                groupedOrders.set(row.temp_id, {
                    temp_id: row.temp_id,
                    session_id: row.session_id,
                    // --- AJOUT : Gestion de partner_id ---
                    partner_id: row.partner_id || null, 
                    // -------------------------------------
                    date: row.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
                    payment_method_id: row.payment_method_id,
                    lines: []
                });
            }

            const order = groupedOrders.get(row.temp_id);
            order.lines.push({
                product_id: row.product_id,
                qty: row.qty,
                price_unit: row.price_unit
            });
        });

        const payload = Array.from(groupedOrders.values());
        setLogs(prev => [...prev, `${payload.length} commandes uniques identifiées.`]);
        
        setLogs(prev => [...prev, "Envoi vers Odoo en cours..."]);
        
        const res = await fetch('/api/odoo-test/import', {
            method: 'POST',
            body: JSON.stringify({ orders: payload }),
        });

        const result = await res.json();

        if (res.ok) {
            setLogs(prev => [...prev, `✅ SUCCÈS : ${result.success} commandes créées.`]);
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
        <h1 className="text-3xl font-bold">Import de Masse (Excel / CSV)</h1>
        
        {/* BOUTON TELECHARGEMENT MODELE */}
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Télécharger le modèle Excel
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border space-y-6">
        
        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
            <p className="font-bold mb-2">Format attendu du fichier :</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Extensions : <strong>.xlsx, .xls, .csv</strong></li>
                <li>Colonnes requises : 
                    <code className="bg-white px-1 ml-1">session_id</code>, 
                    <code className="bg-white px-1 ml-1">temp_id</code>, 
                    <code className="bg-white px-1 ml-1">product_id</code>, 
                    <code className="bg-white px-1 ml-1">qty</code>, 
                    <code className="bg-white px-1 ml-1">price_unit</code>, 
                    <code className="bg-white px-1 ml-1">payment_method_id</code>
                </li>
                <li>Optionnel : 
                    <code className="bg-white px-1 ml-1">partner_id</code> (ID Client), 
                    <code className="bg-white px-1 ml-1">date</code>
                </li>
            </ul>
        </div>

        {/* Input */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
            <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 mb-4 cursor-pointer"
            />
            
            <button 
                onClick={processFile}
                disabled={!file || loading}
                className="bg-green-600 disabled:bg-gray-300 text-white px-8 py-3 rounded font-bold shadow hover:bg-green-700 transition w-full md:w-auto"
            >
                {loading ? 'Traitement en cours...' : 'Lancer l\'importation'}
            </button>
        </div>

        {/* Logs Console */}
        <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-xs shadow-inner">
            {logs.length === 0 && <span className="text-gray-600">// En attente d'actions...</span>}
            {logs.map((log, i) => (
                <div key={i} className="border-b border-gray-800 py-1">{log}</div>
            ))}
        </div>

      </div>
    </div>
  );
}