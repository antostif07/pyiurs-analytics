'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // États pour la progression
  const [progress, setProgress] = useState(0);

  // --- CONFIGURATION ---
  const BATCH_SIZE = 20; // Envoi par paquet de 20 commandes pour éviter le timeout

  // Fonction de nettoyage de date
  const formatExcelDate = (input: any) => {
    try {
      if (!input) return new Date().toISOString().slice(0, 19).replace('T', ' ');
      let dateObj: Date;
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

  const downloadTemplate = () => {
    const templateData = [
        { session_id: 1, temp_id: 'CMD-001', partner_id: 10, date: '2024-01-01 10:00:00', product_id: 50, qty: 2, price_unit: 10.0, payment_method_id: 1 },
        { session_id: 1, temp_id: 'CMD-001', partner_id: 10, date: '2024-01-01 10:00:00', product_id: 51, qty: 1, price_unit: 5.0, payment_method_id: 1 },
        { session_id: 1, temp_id: 'CMD-002', partner_id: '', date: '2024-01-01 10:30:00', product_id: 50, qty: 1, price_unit: 10.0, payment_method_id: 1 }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modele Import");
    XLSX.writeFile(wb, "modele_import_pos.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setFile(e.target.files[0]);
        setLogs([]);
        setProgress(0);
    } 
  };

  // Découpage du tableau en morceaux
  const chunkArray = (array: any[], size: number) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setLogs(["Lecture du fichier..."]);
    setProgress(0);

    // 1. ACTIVER L'ANTI-VEILLE (Wake Lock)
    let wakeLock: any = null;
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        setLogs(prev => [...prev, "💡 Anti-veille activé : L'écran restera allumé."]);
      }
    } catch (err) {
      console.warn("Impossible d'activer l'anti-veille", err);
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
        setLogs(prev => [...prev, "❌ Erreur critique : Impossible de lire le fichier."]);
        setLoading(false);
        if (wakeLock) wakeLock.release();
    };

    reader.onload = (e) => {
      setTimeout(async () => {
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

            setLogs(prev => [...prev, `✅ Fichier lu ! ${rows.length} lignes trouvées.`]);

            // ... (Diagnostic colonnes identique à avant) ...
            if (rows.length > 0) {
                const r = rows[0];
                if (!r.session_id || !r.temp_id || !r.product_id) {
                     setLogs(prev => [...prev, `❌ ERREUR : Colonnes manquantes.`]);
                     setLoading(false);
                     if (wakeLock) wakeLock.release();
                     return;
                }
            }

            // REGROUPEMENT
            const groupedOrders = new Map();
            rows.forEach((row) => {
                if (!row.session_id || !row.temp_id || !row.product_id) return;
                if (!groupedOrders.has(row.temp_id)) {
                    groupedOrders.set(row.temp_id, {
                        temp_id: row.temp_id,
                        session_id: row.session_id,
                        partner_id: row.partner_id || null, 
                        date: formatExcelDate(row.date),
                        payment_method_id: row.payment_method_id,
                        lines: []
                    });
                }
                groupedOrders.get(row.temp_id).lines.push({
                    product_id: row.product_id,
                    qty: row.qty,
                    price_unit: row.price_unit
                });
            });

            const allOrders = Array.from(groupedOrders.values());
            setLogs(prev => [...prev, `${allOrders.length} commandes uniques à traiter.`]);

            // BATCHING
            const batches = chunkArray(allOrders, BATCH_SIZE);
            let globalSuccess = 0;
            let globalFailed = 0;

            setLogs(prev => [...prev, `🚀 Démarrage : ${batches.length} lots à envoyer.`]);

            // BOUCLE D'ENVOI
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                
                // On récupère le dernier ID du lot pour l'info
                const lastIdInBatch = batch[batch.length - 1].temp_id;

                try {
                    const res = await fetch('/api/odoo-test/import', {
                        method: 'POST',
                        body: JSON.stringify({ orders: batch }),
                    });
                    const result = await res.json();

                    if (res.ok) {
                        globalSuccess += result.success;
                        globalFailed += result.failed;
                        
                        // LOG AMÉLIORÉ : On affiche où on en est vraiment
                        // On n'affiche que tous les 5 lots pour ne pas spammer, ou si erreur
                        if (result.failed > 0 || (i + 1) % 5 === 0) {
                             setLogs(prev => [...prev, `ℹ️ Lot ${i+1}/${batches.length} terminé (Dernier ID: ${lastIdInBatch})`]);
                        }
                        
                        if (result.failed > 0) setLogs(prev => [...prev, `⚠️ ${result.failed} erreurs dans ce lot.`]);

                    } else {
                        globalFailed += batch.length;
                        setLogs(prev => [...prev, `❌ Lot ${i+1} ÉCHEC (Dernier ID tenté: ${lastIdInBatch})`]);
                    }
                } catch (err: any) {
                    globalFailed += batch.length;
                    setLogs(prev => [...prev, `❌ Lot ${i+1} ERREUR RÉSEAU (Dernier ID tenté: ${lastIdInBatch})`]);
                }

                setProgress(Math.round(((i + 1) / batches.length) * 100));
            }

            setLogs(prev => [...prev, `🏁 TERMINÉ : ${globalSuccess} succès / ${globalFailed} échecs.`]);
            setLoading(false);
            if (wakeLock) wakeLock.release(); // Libérer l'écran

          } catch (err: any) {
            setLogs(prev => [...prev, `ERREUR CRITIQUE : ${err.message}`]);
            setLoading(false);
            if (wakeLock) wakeLock.release();
          }
      }, 100);
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
        
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Modèle Excel
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border space-y-6">
        
        {/* --- INSTRUCTIONS RESTAURÉES --- */}
        <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
            <p className="font-bold mb-2">Format attendu :</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Extensions : <strong>.xlsx, .xls, .csv</strong></li>
                <li>Colonnes requises : <code className="bg-white px-1">session_id</code>, <code className="bg-white px-1">temp_id</code>, <code className="bg-white px-1">product_id</code>, <code className="bg-white px-1">qty</code>, <code className="bg-white px-1">price_unit</code>, <code className="bg-white px-1">payment_method_id</code></li>
                <li>Optionnel : <code className="bg-white px-1">partner_id</code> (ID Client), <code className="bg-white px-1">date</code></li>
                <li><strong>Note :</strong> Les dates Excel (chiffres) sont converties automatiquement. Le script découpe l'envoi par lots de 20 commandes pour supporter les gros fichiers (10k+ lignes).</li>
            </ul>
        </div>
        {/* ---------------------------------- */}

        {/* Zone Input */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
            <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4 cursor-pointer"
            />
            
            <button 
                onClick={processFile}
                disabled={!file || loading}
                className={`w-full md:w-auto px-8 py-3 rounded font-bold shadow transition ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
            >
                {loading ? `Traitement (${Math.round(progress)}%)` : 'Lancer l\'importation'}
            </button>
        </div>

        {/* BARRE DE PROGRESSION */}
        {loading && (
            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden">
                <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        )}

        {/* Logs Console */}
        <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-xs shadow-inner">
            {logs.length === 0 && <span className="text-gray-600">// En attente...</span>}
            {logs.map((log, i) => (
                <div key={i} className="border-b border-gray-800 py-1">{log}</div>
            ))}
            {/* Ancre pour l'auto-scroll */}
            <div style={{ float:"left", clear: "both" }}
                 ref={(el) => { if(el) el.scrollIntoView({ behavior: "smooth" }); }}>
            </div>
        </div>

      </div>
    </div>
  );
}