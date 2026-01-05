'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

// Interface Types
interface Product {
  id: number;
  display_name: string;
  list_price: number;
  barcode?: string;
  default_code?: string;
}

interface CartItem extends Product {
  qty: number;
  customPrice: number; // Pour le modificateur de prix
}

export default function PosInterface({ params }: { params: Promise<{ id: string }> }) {
  // Gestion des params Next.js 15 (Promise)
  const [sessionId, setSessionId] = useState<number | null>(null);

  const router = useRouter();

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Order States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState<string>('2024-01-01T10:00'); // Date par défaut

  // Déballage de l'ID session
  useEffect(() => {
    params.then((p) => setSessionId(Number(p.id)));
  }, [params]);

  // Chargement initial (Clients & Paiements)
  useEffect(() => {
    // On ne lance le chargement que si on a l'ID de session
    if (!sessionId) return;

    const fetchBaseData = async () => {
      // MODIFICATION ICI : On ajoute ?sessionId=...
      const res = await fetch(`/api/odoo-test/data?sessionId=${sessionId}`);
      const data = await res.json();
      
      setPartners(data.partners || []);
      setPaymentMethods(data.paymentMethods || []);
      
      // Sélectionner la première méthode par défaut si dispo
      if (data.paymentMethods?.length > 0) {
          setSelectedPaymentMethod(data.paymentMethods[0].id);
      }
    };

    fetchBaseData();
  }, [sessionId]);

  // Recherche Produits (Debounce simple)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingProducts(true);
      fetch(`/api/odoo-test/products?search=${searchTerm}`)
        .then(res => res.json())
        .then(data => {
            if(Array.isArray(data)) setProducts(data);
            setLoadingProducts(false);
        });
    }, 500); // Délai de 500ms après frappe
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- LOGIQUE PANIER ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Si existe, +1 qté
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      // Sinon ajout avec prix par défaut
      return [...prev, { ...product, qty: 1, customPrice: product.list_price }];
    });
  };

  const updateLine = (id: number, field: 'qty' | 'customPrice', value: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.qty * item.customPrice), 0);
  };

  // --- VALIDATION COMMANDE ---

  const submitOrder = async () => {
    if (cart.length === 0) return alert("Panier vide !");
    if (!sessionId) return alert("Session ID manquant");
    if (!selectedPaymentMethod) return alert("Méthode de paiement manquante");

    if (!confirm(`Confirmer la commande de ${calculateTotal().toFixed(2)} € datée du ${orderDate} ?`)) return;

    // Préparation des données pour l'API existante
    // On doit adapter l'API pour recevoir 'lines' en détail si ce n'est pas déjà fait
    // Mais pour l'instant on utilise ton API existante qui crée la ligne manuellement, 
    // ou on l'appelle en boucle, ou mieux : on envoie tout l'objet.
    
    // NOTE : On va réutiliser ton endpoint POST /api/odoo-test/orders
    // Mais on va devoir modifier légèrement l'endpoint pour accepter plusieurs lignes avec prix custom
    // Voir étape 3 ci-dessous.
    
    const payload = {
      sessionId,
      partnerId: selectedPartner,
      orderDate: orderDate.replace('T', ' ') + ':00',
      lines: cart.map(item => ({
        product_id: item.id,
        qty: item.qty,
        price_unit: item.customPrice
      })),
      amount: calculateTotal(),
      paymentMethodId: selectedPaymentMethod
    };

    try {
        const res = await fetch('/api/odoo-test/orders/full', { // Nouvelle route "full"
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            alert('Commande créée avec succès ! ID: ' + result.orderId);
            setCart([]); // Vider panier
            router.push('/'); // Retour dashboard ou rester ici
        } else {
            alert('Erreur: ' + result.error);
        }
    } catch (e) {
        alert('Erreur réseau');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* GAUCHE : CATALOGUE */}
      <div className="w-3/5 flex flex-col border-r border-gray-300 bg-white">
        {/* Barre de recherche */}
        <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold mb-2">Catalogue Produits</h2>
            <input 
                type="text" 
                placeholder="Rechercher par Nom, HS Code, Barcode..." 
                className="w-full p-3 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
            />
        </div>

        {/* Liste Produits */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4 content-start">
            {loadingProducts && <p className="col-span-3 text-center text-gray-500">Recherche...</p>}
            
            {!loadingProducts && products.map(p => (
                <div 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    className="border p-3 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition shadow-sm bg-white flex flex-col justify-between h-28"
                >
                    <div>
                        <div className="font-bold text-sm text-gray-800 line-clamp-2">{p.display_name}</div>
                        <div className="text-xs text-gray-500 mt-1">Ref: {p.default_code || p.barcode || '-'}</div>
                    </div>
                    <div className="font-bold text-blue-600 self-end">{p.list_price.toFixed(2)} €</div>
                </div>
            ))}
        </div>
      </div>

      {/* DROITE : COMMANDE */}
      <div className="w-2/5 flex flex-col bg-gray-50">
        
        {/* Header Commande */}
        <div className="p-4 bg-white border-b shadow-sm space-y-3">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl">Nouvelle Vente</h2>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Session #{sessionId}</span>
            </div>

            {/* Date Order */}
            <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500">Date de la commande</label>
                <input 
                    type="datetime-local" 
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="border p-2 rounded text-sm w-full"
                />
            </div>

            {/* Client */}
            <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500">Client</label>
                <select 
                    className="border p-2 rounded text-sm w-full"
                    value={selectedPartner || ''}
                    onChange={(e) => setSelectedPartner(Number(e.target.value))}
                >
                    <option value="">Client Anonyme</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        </div>

        {/* Liste Panier */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 && (
                <div className="text-center text-gray-400 mt-10">Panier vide. Cliquez sur un produit.</div>
            )}
            
            {cart.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded shadow-sm border flex items-center gap-3">
                    <div className="flex-1">
                        <div className="font-bold text-sm">{item.display_name}</div>
                        <div className="text-xs text-gray-400">{item.barcode}</div>
                    </div>

                    {/* Modificateurs */}
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col w-16">
                            <label className="text-[10px] text-gray-400">Prix U.</label>
                            <input 
                                type="number" 
                                value={item.customPrice}
                                onChange={(e) => updateLine(item.id, 'customPrice', parseFloat(e.target.value))}
                                className="border rounded p-1 text-sm text-right"
                            />
                        </div>
                        <div className="flex flex-col w-14">
                            <label className="text-[10px] text-gray-400">Qté</label>
                            <input 
                                type="number" 
                                value={item.qty}
                                onChange={(e) => updateLine(item.id, 'qty', parseFloat(e.target.value))}
                                className="border rounded p-1 text-sm text-right font-bold"
                            />
                        </div>
                    </div>

                    <div className="w-16 text-right font-bold text-gray-700">
                        {(item.qty * item.customPrice).toFixed(2)}
                    </div>

                    <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>

        {/* Footer Totaux */}
        <div className="p-4 bg-white border-t shadow-lg">
            <div className="flex justify-between items-center mb-4 text-2xl font-bold">
                <span>Total</span>
                <span>{calculateTotal().toFixed(2)} €</span>
            </div>

            <div className="mb-4">
                 <label className="text-xs font-bold text-gray-500 block mb-1">Méthode de Paiement</label>
                 <select 
                    className="border p-2 rounded w-full"
                    value={selectedPaymentMethod || ''}
                    onChange={(e) => setSelectedPaymentMethod(Number(e.target.value))}
                 >
                     {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
            </div>

            <button 
                onClick={submitOrder}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded text-lg shadow transition transform active:scale-95"
            >
                VALIDER LA VENTE
            </button>
        </div>
      </div>
    </div>
  );
}