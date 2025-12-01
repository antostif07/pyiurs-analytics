'use client'

import { motion } from 'framer-motion';
import { Facebook, PauseCircle, PlayCircle, Instagram } from 'lucide-react';
import { useRef, useState } from 'react';
import { addCampaign, stopCampaign } from '../actions';

export default function CampaignsWidget({ campaigns }: { campaigns: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Facebook className="text-blue-600" size={20}/> Boosts Actifs
        </h2>
        <button 
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
        >
            {showForm ? 'Annuler' : '+ Nouveau Boost'}
        </button>
      </div>

      {/* FORMULAIRE D'AJOUT (Masqué par défaut) */}
      {showForm && (
        <form 
            ref={formRef}
            action={async (formData) => {
                await addCampaign(formData);
                formRef.current?.reset();
                setShowForm(false);
            }}
            className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2"
        >
            <input type="text" name="name" placeholder="Nom (ex: Coll. Hiver)" className="w-full p-2 rounded-lg border-none text-sm" required />
            <div className="flex gap-2">
                <select name="platform" className="w-1/2 p-2 rounded-lg border-none text-sm">
                    <option value="facebook">Facebook / Insta</option>
                    <option value="tiktok">TikTok Ads</option>
                </select>
                <input type="number" name="budget" placeholder="Budget ($)" className="w-1/2 p-2 rounded-lg border-none text-sm" required />
            </div>
            <button type="submit" className="w-full py-2 bg-black text-white rounded-lg text-sm font-medium">Lancer</button>
        </form>
      )}

      {/* LISTE DES CAMPAGNES */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Aucun boost en cours</p>
        ) : (
            campaigns.map((camp) => (
            <motion.div 
                key={camp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        {camp.platform === 'tiktok' ? <PlayCircle size={18}/> : <Facebook size={18}/>}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">{camp.name}</h4>
                        <p className="text-xs text-gray-500">Budget: {camp.budget}€/j</p>
                    </div>
                </div>
                <button 
                    onClick={() => stopCampaign(camp.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors" title="Arrêter"
                >
                    <PauseCircle size={20} />
                </button>
            </motion.div>
            ))
        )}
      </div>
    </div>
  );
}