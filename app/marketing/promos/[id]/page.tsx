import { ArrowLeft, TrendingDown, Store, Tag } from 'lucide-react';
import Link from 'next/link';
import { getCampaignDetails } from '../../actions'; // Ajuste le chemin selon ton projet
import CampaignTable from '../../components/CampaignTable';
import ExportButton from '../../components/ExportButton';

// Helper pour le formatage monétaire (pour les cartes du haut)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export default async function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCampaignDetails(id);

  if (!data) return <div>Campagne introuvable</div>;
  const { campaign, details } = data;

  // --- CALCULS DES TOTAUX ---
  const totalShopValue = details.reduce((sum: number, p: any) => sum + (p.shop_price * p.qty_available), 0);
  const totalPromoValue = details.reduce((sum: number, p: any) => sum + (p.promo_price * p.qty_available), 0);
  const totalDiscountAmount = totalShopValue - totalPromoValue;

  return (
    <div className="min-h-screen pb-10">
      
      {/* HEADER NAVIGATION */}
      <div className="mb-6">
        <Link href="/dashboard/promos" className="text-sm text-gray-500 hover:text-black flex items-center gap-1 mb-4">
            <ArrowLeft size={16} /> Retour aux campagnes
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{campaign.product_name}</h1>
                <p className="text-gray-500 mt-1">
                    Réduction: <span className="font-bold text-red-600">-{campaign.discount_percent}%</span> 
                    • Produits: {details.length}
                </p>
            </div>
            {/* BOUTON EXCEL */}
            <ExportButton campaignName={campaign.product_name} data={details} />
        </div>
      </div>

      {/* --- CARTES DE RÉSUMÉ FINANCIER --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        
        {/* 1. Valeur Avant Promo */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1 text-sm font-medium uppercase">
                <Store size={16} /> Valeur Stock Boutique
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalShopValue)}</div>
            <div className="text-xs text-gray-400 mt-1">Prix initial sans remise</div>
        </div>

        {/* 2. Valeur Remise (Perte théorique) */}
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 mb-1 text-sm font-medium uppercase">
                <TrendingDown size={16} /> Montant Remisé
            </div>
            <div className="text-2xl font-bold text-red-700">-{formatCurrency(totalDiscountAmount)}</div>
            <div className="text-xs text-red-500/70 mt-1">Cadeau offert aux clients</div>
        </div>

        {/* 3. Valeur Attendue (Objectif) */}
        <div className="bg-blue-600 p-5 rounded-xl shadow-md text-white">
            <div className="flex items-center gap-2 text-blue-200 mb-1 text-sm font-medium uppercase">
                <Tag size={16} /> CA Prévisionnel Promo
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalPromoValue)}</div>
            <div className="text-xs text-blue-200 mt-1">Objectif cash si tout est vendu</div>
        </div>

      </div>

      {/* TABLEAU REACT TABLE (Client Component) */}
      <CampaignTable data={details} />

    </div>
  );
}