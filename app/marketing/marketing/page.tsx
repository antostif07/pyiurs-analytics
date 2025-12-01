import { supabase } from '@/lib/supabase';
import { Megaphone, MessageCircle, Eye, MousePointer2, Smartphone } from 'lucide-react';
import { getWeeklyStats, getActiveCampaigns } from '../actions';
import CampaignsWidget from '../components/CampaignsWidget';
import StatInput from '../components/StatInput';

export default async function MarketingPage() {
  const stats = await getWeeklyStats();
  const campaigns = await getActiveCampaigns();

  // Récupérer les publications prévues (Agenda)
  const { data: plannedPosts } = await supabase
    .from('tasks')
    .select('*')
    .in('task_type', ['video', 'promo', 'catalog'])
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(3);

  return (
    <div className="min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
             <Megaphone className="text-pink-600" size={32} /> Marketing Center
        </h1>
        <p className="text-gray-500 mt-1">Performances des 7 derniers jours.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE (2/3) : STATS & SAISIE */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Zone de saisie rapide */}
            <StatInput />

            {/* 2. Cartes de Performance (Organique) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TIKTOK */}
                <div className="bg-black text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Smartphone size={80} />
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">TikTok Vues (7j)</h3>
                    <div className="text-4xl font-bold">{stats.tiktok_views.toLocaleString()}</div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                        <Eye size={14} /> Vues cumulées manuelles
                    </div>
                </div>

                {/* WHATSAPP */}
                <div className="bg-green-500 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageCircle size={80} />
                    </div>
                    <h3 className="text-green-100 text-sm font-medium mb-1">Statuts WhatsApp</h3>
                    <div className="text-4xl font-bold">{stats.whatsapp_views.toLocaleString()}</div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-green-100">
                        <Eye size={14} /> Vues moyennes par statut
                    </div>
                </div>

                {/* FACEBOOK ADS */}
                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group md:col-span-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-blue-200 text-sm font-medium mb-1">Facebook Ads (Impact)</h3>
                            <div className="text-4xl font-bold">{stats.whatsapp_clicks} <span className="text-lg font-normal text-blue-200">clics vers WhatsApp</span></div>
                        </div>
                        <div className="text-right">
                             <h3 className="text-blue-200 text-sm font-medium mb-1">Portée (Reach)</h3>
                             <div className="text-2xl font-bold">{stats.fb_reach.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MousePointer2 size={100} />
                    </div>
                </div>
            </div>

            {/* 3. Planning des publications (Lien avec Agenda) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">📢 Publications Prévues (Prochainement)</h3>
                <div className="space-y-3">
                    {plannedPosts?.length === 0 ? (
                        <p className="text-gray-400 text-sm">Rien de prévu à l'agenda.</p>
                    ) : (
                        plannedPosts?.map(post => (
                            <div key={post.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                <div className="text-center bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                    <span className="block text-xs text-gray-400 uppercase">{new Date(post.due_date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                    <span className="block text-lg font-bold text-gray-800">{new Date(post.due_date).getDate()}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{post.title}</h4>
                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block capitalize">{post.task_type}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>

        {/* COLONNE DROITE (1/3) : WIDGET CAMPAGNES */}
        <div className="h-fit">
            <CampaignsWidget campaigns={campaigns} />
            
            {/* Note d'équipe */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-yellow-800">
                ⚠️ <strong>Rappel :</strong>
                <p className="mt-1 opacity-80">N'oubliez pas d'entrer les vues TikTok tous les soirs à 18h via le formulaire ci-dessus.</p>
            </div>
        </div>

      </div>
    </div>
  );
}