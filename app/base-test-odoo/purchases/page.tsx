'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchableSelect from '@/app/api/odoo-test/components/SearchableSelect';
import { usePathname } from 'next/navigation';

export default function PurchasesPage() {
    const pathname = usePathname();
  // --- ÉTATS DE DONNÉES ---
  const [purchases, setPurchases] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  // --- ÉTATS DU FORMULAIRE ---
  const [newOrderDate, setNewOrderDate] = useState('2024-01-01T10:00');
  const [selectedPartner, setSelectedPartner] = useState<string | number>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string | number>('');

  // --- ÉTATS DU PANIER ---
  const [tempProductId, setTempProductId] = useState<string | number>('');
  const [tempTaxId, setTempTaxId] = useState<string | number>('');
  const [cart, setCart] = useState<any[]>([]);

  // --- ÉTATS D'INTERFACE ---
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    fetchPurchases();
    fetchBaseData();
  }, []);

  // Charger la liste des achats existants
  const fetchPurchases = async () => {
    const res = await fetch('/api/odoo-test/purchases');
    const data = await res.json();
    if (Array.isArray(data)) setPurchases(data);
  };

  // Charger les données statiques (Taxes, Devises)
  const fetchBaseData = async () => {
    const res = await fetch('/api/odoo-test/data');
    const data = await res.json();
    
    setTaxes(data.taxes || []);
    setCurrencies(data.currencies || []);
    
    // Sélectionner la première devise par défaut
    if (data.currencies?.length > 0) {
        setSelectedCurrency(data.currencies[0].id);
    }
  };

  // --- FONCTIONS DE RECHERCHE ASYNCHRONE (Pour SearchableSelect) ---

  // 1. Chercher Fournisseurs (API)
  const searchPartners = async (query: string) => {
    const res = await fetch(`/api/odoo-test/partners?search=${query}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sub: p.email || p.phone
    })) : [];
  };

  // 2. Chercher Produits (API)
  const searchProducts = async (query: string) => {
    const res = await fetch(`/api/odoo-test/products?search=${query}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map((p: any) => ({
        id: p.id,
        name: p.display_name,
        sub: `${p.default_code || 'Sans Ref'} - ${p.list_price} €`
    })) : [];
  };

  // --- GESTION DU PANIER ---

  // Ajouter un produit au panier
  const addToCart = async () => {
    if (!tempProductId) return;

    // On doit récupérer les détails du produit (Prix notamment) via l'ID
    // car le Select ne nous donne que l'ID sélectionné.
    const res = await fetch(`/api/odoo-test/products?id=${tempProductId}`);
    const data = await res.json();
    const product = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (product) {
        setCart([...cart, { 
            product_id: product.id, 
            name: product.display_name, 
            qty: 1, 
            price_unit: product.list_price,
            tax_id: tempTaxId || '' // Taxe sélectionnée ou vide
        }]);
        setTempProductId(''); // Reset du champ recherche
    }
  };

  // Mettre à jour une ligne du panier (Qté, Prix, Taxe)
  const updateCart = (index: number, field: string, value: any) => {
    const newCart = [...cart];
    newCart[index][field] = value;
    setCart(newCart);
  };

  // Supprimer une ligne
  const removeLine = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // --- ACTIONS PRINCIPALES (API) ---

  // 1. Créer la Commande
  const createPurchase = async () => {
    if (!selectedPartner || cart.length === 0) return alert("Veuillez choisir un fournisseur et des produits.");
    
    setLoading(true);
    setStatus("Création commande...");

    const formattedDate = newOrderDate.replace('T', ' ') + ':00';

    const res = await fetch('/api/odoo-test/purchases', {
        method: 'POST',
        body: JSON.stringify({
            partnerId: selectedPartner,
            currencyId: selectedCurrency,
            date: formattedDate,
            lines: cart
        })
    });
    
    const data = await res.json();
    if (data.success) {
        setStatus("Commande créée ! Validation automatique en cours...");
        // On enchaîne directement avec la confirmation
        await confirmPurchase(data.purchaseId, formattedDate);
        setCart([]); // Vider le panier
        fetchPurchases(); // Rafraîchir la liste
    } else {
        setStatus("Erreur Création : " + data.error);
    }
    setLoading(false);
  };

  // 2. Confirmer la Commande (Bouton ou Automatique)
  const confirmPurchase = async (id: number, dateStr: string) => {
    setStatus(`Confirmation PO #${id}...`);
    await fetch('/api/odoo-test/purchases/confirm', {
        method: 'POST',
        body: JSON.stringify({ purchaseId: id, confirmDate: dateStr })
    });
    setStatus(`PO #${id} confirmé avec succès.`);
    fetchPurchases();
  };

  // 3. Réceptionner le Stock (Stock Picking)
  const receiveGoods = async (poName: string, dateStr: string) => {
    if (!confirm(`Confirmer la réception totale pour ${poName} à la date du ${dateStr} ?`)) return;
    
    setStatus(`Réception stock pour ${poName}...`);
    
    const res = await fetch('/api/odoo-test/purchases/receive', {
        method: 'POST',
        body: JSON.stringify({ purchaseName: poName, receptionDate: dateStr })
    });

    const data = await res.json();
    if (data.success) {
        setStatus(`✅ Stock reçu pour ${poName} et validé au ${dateStr} !`);
        fetchPurchases();
    } else {
        setStatus("❌ Erreur Réception: " + data.error);
    }
  };

  // --- RENDU VISUEL ---
  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-gray-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Gestion des Achats</h1>
            <Link href="/" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
        </div>
        
        {/* Bouton Import */}
        <Link 
            href={`${pathname}/import`}
            className="bg-gray-800 text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2 hover:bg-gray-700"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import Excel
        </Link>
        </div>

      {status && <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-6 text-blue-800 font-medium shadow-sm">{status}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === COLONNE GAUCHE : FORMULAIRE === */}
        <div className="bg-white p-6 rounded-lg shadow-md border h-fit flex flex-col gap-5">
            <h2 className="font-bold text-lg border-b pb-2 text-gray-700">Nouvel Achat</h2>
            
            {/* Date & Devise */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Date (Commande & Stock)</label>
                    <input 
                        type="datetime-local" 
                        value={newOrderDate} 
                        onChange={e => setNewOrderDate(e.target.value)} 
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Devise</label>
                    <select 
                        className="w-full border p-2 rounded text-sm bg-white"
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                    >
                        {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                    </select>
                </div>
            </div>

            {/* Recherche Fournisseur */}
            <div className="z-20 relative">
                <SearchableSelect 
                    label="Fournisseur"
                    placeholder="Tapez un nom..."
                    loadOptions={searchPartners}
                    value={selectedPartner}
                    onChange={setSelectedPartner}
                />
            </div>

            {/* Ajout Produits */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                <label className="block text-xs font-bold text-gray-500 mb-2">Ajouter un produit</label>
                
                <div className="mb-3 z-10 relative">
                    <SearchableSelect 
                        placeholder="Tapez produit (ex: Laptop)..."
                        loadOptions={searchProducts}
                        value={tempProductId}
                        onChange={setTempProductId}
                    />
                </div>

                <div className="flex gap-2">
                   {/* Choix Taxe à l'ajout */}
                   <select 
                        className="w-full border p-2 rounded text-xs bg-white"
                        value={tempTaxId}
                        onChange={(e) => setTempTaxId(e.target.value)}
                    >
                        <option value="">-- Sans Taxe --</option>
                        {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.amount}%)</option>)}
                   </select>

                   <button 
                     onClick={addToCart}
                     className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 transition shadow-sm"
                   >
                     Ajouter
                   </button>
                </div>
            </div>

            {/* Panier */}
            <div className="border rounded bg-white max-h-64 overflow-y-auto shadow-inner">
                {cart.length === 0 && <p className="text-gray-400 text-xs italic text-center py-4">Le panier est vide</p>}
                
                {cart.map((line, idx) => (
                    <div key={idx} className="p-2 border-b last:border-0 text-xs hover:bg-gray-50">
                        <div className="flex justify-between font-bold mb-1 text-gray-800">
                            <span>{line.name}</span>
                            <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="flex flex-col w-1/4">
                                <span className="text-[10px] text-gray-400">Qté</span>
                                <input 
                                    type="number" 
                                    value={line.qty} 
                                    onChange={e => updateCart(idx, 'qty', e.target.value)} 
                                    className="border p-1 rounded text-center"
                                />
                            </div>
                            <div className="flex flex-col w-1/3">
                                <span className="text-[10px] text-gray-400">Prix U.</span>
                                <input 
                                    type="number" 
                                    value={line.price_unit} 
                                    onChange={e => updateCart(idx, 'price_unit', e.target.value)} 
                                    className="border p-1 rounded text-right"
                                />
                            </div>
                            <div className="flex flex-col w-1/3">
                                <span className="text-[10px] text-gray-400">Taxe</span>
                                <select 
                                    className="border p-1 rounded w-full truncate bg-white"
                                    value={line.tax_id}
                                    onChange={(e) => updateCart(idx, 'tax_id', e.target.value)}
                                >
                                    <option value="">-</option>
                                    {taxes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={createPurchase} 
                disabled={loading || cart.length === 0} 
                className="w-full bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded font-bold hover:bg-blue-700 transition shadow"
            >
                {loading ? 'Traitement en cours...' : 'VALIDER LA COMMANDE'}
            </button>
        </div>

        {/* === COLONNE DROITE : LISTE === */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md border overflow-hidden flex flex-col h-fit">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h2 className="font-bold text-gray-700">Historique des Commandes</h2>
                <button onClick={fetchPurchases} className="text-xs text-blue-600 hover:underline">Rafraîchir</button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="bg-white text-xs font-semibold text-gray-600 uppercase border-b">
                            <th className="px-4 py-3 text-left">Référence</th>
                            <th className="px-4 py-3 text-left">Fournisseur</th>
                            <th className="px-4 py-3 text-left">Total</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-center">État</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                                <td className="px-4 py-3 font-bold text-sm text-blue-600">{p.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{p.partner_id ? p.partner_id[1] : '-'}</td>
                                <td className="px-4 py-3 text-sm font-bold">{p.amount_total}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {p.date_approve || p.date_order}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                        p.state === 'purchase' || p.state === 'done' ? 'bg-green-100 text-green-800' : 
                                        p.state === 'cancel' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {p.state === 'purchase' ? 'Confirmé' : p.state}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    
                                    {/* Action Confirmer (si brouillon) */}
                                    {(p.state === 'draft' || p.state === 'sent') && (
                                        <button 
                                            onClick={() => confirmPurchase(p.id, p.date_order)}
                                            className="text-blue-600 hover:underline text-xs font-bold"
                                        >
                                            Confirmer
                                        </button>
                                    )}

                                    {/* Action Recevoir Stock (si confirmé) */}
                                    {p.state === 'purchase' && (
                                        <button 
                                            onClick={() => receiveGoods(p.name, p.date_approve || p.date_order)}
                                            className="bg-green-600 text-white border border-green-600 px-3 py-1 rounded text-xs font-bold hover:bg-green-700 shadow-sm transition"
                                        >
                                            📥 Recevoir
                                        </button>
                                    )}

                                    {/* Indicateur Fini */}
                                    {p.state === 'done' && (
                                        <span className="text-gray-400 text-xs">Terminé</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {purchases.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Aucun achat trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}