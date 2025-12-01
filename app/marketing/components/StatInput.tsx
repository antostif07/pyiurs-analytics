'use client'

import { useRef } from 'react';
import { PlusCircle } from 'lucide-react';
import { addDailyStat } from '../actions';

export default function StatInput() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
      <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">📝 Saisie Rapide (Aujourd'hui)</h3>
      <form 
        ref={formRef}
        action={async (formData) => {
          await addDailyStat(formData);
          formRef.current?.reset();
        }}
        className="flex gap-2 items-center"
      >
        <select name="platform" className="p-2 bg-gray-50 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-blue-300">
          <option value="tiktok">TikTok</option>
          <option value="whatsapp">WhatsApp (Statut)</option>
          <option value="facebook">Facebook (Pub)</option>
        </select>

        <select name="metric" className="p-2 bg-gray-50 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-blue-300">
          <option value="views">Vues / Portée</option>
          <option value="whatsapp_clicks">Clics WhatsApp</option>
          <option value="interactions">Interactions</option>
        </select>

        <input 
          type="number" 
          name="value" 
          placeholder="Valeur (ex: 1500)" 
          className="w-24 p-2 bg-gray-50 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-blue-300"
          required
        />

        <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <PlusCircle size={20} />
        </button>
      </form>
    </div>
  );
}