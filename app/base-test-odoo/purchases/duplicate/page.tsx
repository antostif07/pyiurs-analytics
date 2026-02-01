'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DuplicateYearPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  
  // NOUVEAU : Gestion des compagnies
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  const [ordersToProcess, setOrdersToProcess] = useState<any[]>([]);
  const [step, setStep] = useState(1); 

  // Charger les compagnies au montage
  useEffect(() => {
    const fetchCompanies = async () => {
        const res = await fetch('/api/odoo-test/companies');
        const data = await res.json();
        if (Array.isArray(data)) {
            setCompanies(data);
            if (data.length > 0) setSelectedCompany(data[0].id);
        }
    };
    fetchCompanies();
  }, []);

  // --- 1. CHARGEMENT AVEC FILTRE COMPANY ---
  const fetchOldData = async () => {
    if (!selectedCompany) return alert("Sélectionnez une société");
    
    setLoading(true);
    setLogs([`Récupération des achats 2024 pour la société ID ${selectedCompany}...`]);
    
    try {
        const res = await fetch('/api/odoo-test/purchases/fetch-year', {
            method: 'POST',
            body: JSON.stringify({ 
                year: 2024,
                companyId: selectedCompany // Envoi de l'ID
            }),
        });
        const data = await res.json();

        if (data.orders) {
            setLogs(prev => [...prev, `✅ ${data.count} achats récupérés.`]);
            
            const newOrders = data.orders.map((o: any) => {
                let newDate = o.date.replace('2024', '2025');
                if (newDate.includes('2025-02-29')) newDate = newDate.replace('02-29', '02-28');
                return { ...o, date: newDate };
            });

            setOrdersToProcess(newOrders);
            setStep(2); 
        } else {
            setLogs(prev => [...prev, `❌ Erreur Backend : ${data.error}`]);
        }
    } catch (e: any) {
        setLogs(prev => [...prev, `❌ Erreur Réseau : ${e.message}`]);
    }
    setLoading(false);
  };

  // --- 2. TRAITEMENT (Identique) ---
  const chunkArray = (array: any[], size: number) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
  };

  const startDuplication = async () => {
    setLoading(true);
    setStep(3);
    setLogs(prev => [...prev, `🚀 Duplication vers 2025 en cours...`]);

    const BATCH_SIZE = 5;
    const batches = chunkArray(ordersToProcess, BATCH_SIZE);
    
    let globalSuccess = 0;
    let globalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        try {
            const res = await fetch('/api/odoo-test/purchases/import', {
                method: 'POST',
                body: JSON.stringify({ orders: batch }),
            });
            const result = await res.json();

            if (res.ok) {
                globalSuccess += result.success;
                globalFailed += result.failed;
                if (result.failed > 0) setLogs(prev => [...prev, `⚠️ Lot ${i+1}: ${result.failed} erreurs`]);
            } else {
                globalFailed += batch.length;
                setLogs(prev => [...prev, `❌ Lot ${i+1} ÉCHEC`]);
            }
        } catch (err) {
            globalFailed += batch.length;
            setLogs(prev => [...prev, `❌ Lot ${i+1} ERREUR CRITIQUE`]);
        }
        setProgress(Math.round(((i + 1) / batches.length) * 100));
        if ((i + 1) % 5 === 0) setLogs(prev => [...prev, `ℹ️ Avancement : ${i+1}/${batches.length} lots.`]);
    }

    setLogs(prev => [...prev, `🏁 TERMINÉ : ${globalSuccess} succès / ${globalFailed} échecs.`]);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Duplication Multi-Company</h1>
          <Link href="/purchases" className="text-blue-600 hover:underline">← Retour</Link>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border space-y-6">
        
        {/* ÉTAPE 1 */}
        {step === 1 && (
            <div className="text-center py-10 space-y-6">
                <p className="text-gray-600">
                    Sélectionnez la société dont vous voulez dupliquer l'historique 2024 vers 2025.
                </p>

                {/* SÉLECTEUR DE COMPAGNIE */}
                <div className="max-w-xs mx-auto text-left">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Société Cible</label>
                    <select 
                        className="w-full border p-2 rounded shadow-sm bg-white"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <button 
                    onClick={fetchOldData} 
                    disabled={loading || !selectedCompany}
                    className="bg-blue-600 text-white px-8 py-3 rounded font-bold shadow hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                    {loading ? 'Chargement...' : '1. Charger les achats 2024'}
                </button>
            </div>
        )}

        {/* ÉTAPE 2 */}
        {step === 2 && (
            <div className="text-center py-10 bg-green-50 rounded border border-green-200">
                <h2 className="text-xl font-bold text-green-800 mb-2">Prêt à dupliquer</h2>
                <p className="text-gray-700 mb-6">
                    Société : <strong>{companies.find(c => c.id == selectedCompany)?.name}</strong><br/>
                    Commandes trouvées : <strong>{ordersToProcess.length}</strong>
                </p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => { setStep(1); setOrdersToProcess([]); setLogs([]); }}
                        className="text-gray-600 underline text-sm"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={startDuplication} 
                        className="bg-green-600 text-white px-8 py-3 rounded font-bold shadow hover:bg-green-700 transition"
                    >
                        2. Lancer la duplication
                    </button>
                </div>
            </div>
        )}

        {/* ÉTAPE 3 */}
        {step === 3 && (
            <>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-xs shadow-inner">
                    {logs.map((log, i) => (
                        <div key={i} className="border-b border-gray-800 py-1">{log}</div>
                    ))}
                    <div style={{ float:"left", clear: "both" }} ref={(el) => { if(el) el.scrollIntoView({ behavior: "smooth" }); }}></div>
                </div>
            </>
        )}

      </div>
    </div>
  );
}