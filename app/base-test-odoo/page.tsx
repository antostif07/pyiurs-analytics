// app/page.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const getCurrentDateTime = () => new Date().toISOString().slice(0, 16);

export default function Dashboard() {
    const pathname = usePathname();
  const [sessions, setSessions] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]); // Liste des POS disponibles
  const [selectedConfigId, setSelectedConfigId] = useState<string>(''); // POS choisi
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [closeDate, setCloseDate] = useState(getCurrentDateTime());

  // Charger les sessions ET les configs POS au démarrage
  useEffect(() => {
    fetchSessions();
    fetchConfigs();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await fetch('/api/odoo-test/sessions');
    const data = await res.json();
    if (Array.isArray(data)) setSessions(data);
    setLoading(false);
  };

  const fetchConfigs = async () => {
    const res = await fetch('/api/odoo-test/configs');
    const data = await res.json();
    if (Array.isArray(data)) {
      setConfigs(data);
      if (data.length > 0) setSelectedConfigId(data[0].id); // Sélectionner le premier par défaut
    }
  };

  // Créer une session pour le POS choisi
  const createSession = async () => {
    if (!selectedConfigId) {
      alert("Veuillez sélectionner un Point de Vente (POS Config) d'abord.");
      return;
    }

    setStatus('Création session en cours...');
    const res = await fetch('/api/odoo-test/sessions', {
      method: 'POST',
      body: JSON.stringify({ config_id: selectedConfigId }),
    });
    const data = await res.json();
    
    if (data.success) {
      setStatus('Session créée avec succès !');
      fetchSessions(); // Rafraîchir la liste
    } else {
      setStatus('Erreur création: ' + data.error);
    }
  };

  const closeSession = async (sessionId: number) => {
    if (!confirm("Voulez-vous fermer cette session à la date indiquée ?")) return;
    setStatus(`Fermeture session ${sessionId}...`);
    const formattedDate = closeDate.replace('T', ' ') + ':00';

    const res = await fetch('/api/odoo-test/sessions/close', {
      method: 'POST',
      body: JSON.stringify({ sessionId, endDate: formattedDate }),
    });

    const data = await res.json();
    if (data.success) {
      setStatus('Session fermée !');
      fetchSessions();
    } else {
      setStatus('Erreur fermeture: ' + data.error);
    }
  };

  // Simuler une commande (optionnel, gardé pour test)
//   const createTestOrder = async (sessionId: number) => {
//     setStatus('Injection vente...');
//     await fetch('/api/odoo-test/orders', {
//         method: 'POST',
//         body: JSON.stringify({ sessionId, amount: 50.00, partnerId: null }),
//     });
//     setStatus('Vente injectée.');
//   };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manager Odoo POS</h1>
        
        {/* BOUTON VERS LA PAGE IMPORT */}
        <Link 
          href={`${pathname}/import`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow font-bold flex items-center gap-2 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Import Masse (Excel/CSV)
        </Link>
        <Link 
          href={`${pathname}/purchases`}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg shadow font-bold flex items-center gap-2 transition ml-4"
        >
          📦 Gestion Achats
        </Link>
      </div>

      {/* ZONE DE CONTROLE : Création & Paramètres */}
      <div className="bg-white p-6 rounded-lg shadow border mb-8 flex flex-wrap gap-8 items-end">
        
        {/* Bloc 1: Créer une session */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-gray-700">1. Choisir le Point de Vente</label>
          <div className="flex gap-2">
            <select 
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              className="border p-2 rounded text-sm min-w-50"
            >
              {configs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={createSession}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium transition shadow-sm"
            >
              + Créer Session
            </button>
          </div>
        </div>

        {/* Bloc 2: Paramètres de fermeture */}
        <div className="flex flex-col gap-2 border-l pl-8 border-gray-200">
          <label className="text-sm font-bold text-gray-700">2. Date de fermeture cible</label>
          <input 
             type="datetime-local" 
             value={closeDate}
             onChange={(e) => setCloseDate(e.target.value)}
             className="border p-2 rounded text-sm w-55"
           />
        </div>

        {/* Bloc 3: Rafraîchir */}
        <div className="ml-auto">
             <button onClick={fetchSessions} className="text-gray-500 hover:text-gray-800 underline text-sm">
                Rafraîchir la liste
             </button>
        </div>
      </div>

      {status && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-6">{status}</div>}

      {/* TABLEAU DES SESSIONS */}
      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase border-b">
              <th className="px-5 py-3">Point de Vente</th>
              <th className="px-5 py-3">Nom Session</th>
              <th className="px-5 py-3">État</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Chargement...</td></tr>}
            
            {!loading && sessions.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-5 py-4 text-sm font-medium">
                  {s.config_id ? s.config_id[1] : 'Inconnu'}
                </td>
                
                {/* --- MODIFICATION ICI : ID À CÔTÉ DU NOM --- */}
                <td className="px-5 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span 
                      className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 select-all cursor-copy"
                      title="ID de session (cliquer pour sélectionner)"
                    >
                      {s.id}
                    </span>
                  </div>
                </td>
                {/* ------------------------------------------- */}

                <td className="px-5 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${
                    s.state === 'opened' ? 'bg-green-50 text-green-700 border-green-200' : 
                    s.state === 'closed' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    {s.state === 'opened' ? 'OUVERTE' : s.state === 'closed' ? 'FERMÉE' : s.state}
                  </span>
                </td>

                <td className="px-5 py-4 text-gray-500 text-xs">
                  <div>Début : {s.start_at}</div>
                  {s.stop_at && <div>Fin : {s.stop_at}</div>}
                </td>

                <td className="px-5 py-4 text-sm text-right flex justify-end gap-2">
                  {s.state === 'opened' && (
                    <>
                      <a 
                        href={`${pathname}/sessions/${s.id}`}
                        className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700 ml-2 no-underline"
                        >
                        Ouvrir Interface Vente
                        </a>

                      <button 
                        onClick={() => closeSession(s.id)}
                        className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold transition shadow-sm"
                      >
                        Fermer Session
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}