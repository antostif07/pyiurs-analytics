'use client'

import { useRef } from 'react';
import { Plus, Calendar, Tag } from 'lucide-react';
import { addTaskFull } from '../actions';

export default function NewTaskForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Planifier une action</h3>
      
      <form 
        ref={formRef}
        action={async (formData) => {
          await addTaskFull(formData);
          formRef.current?.reset();
        }}
        className="space-y-4"
      >
        {/* TITRE */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</label>
          <input 
            name="title"
            type="text" 
            placeholder="Ex: Shooting Collection Été" 
            className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>

        {/* DATE & TYPE */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
               Date
            </label>
            <input 
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]} 
              className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
               Type
            </label>
            <select 
              name="type"
              className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none"
            >
              <option value="general">Général</option>
              <option value="video">Vidéo / TikTok</option>
              <option value="shoot">Shooting</option>
              <option value="promo">Promo / Pub</option>
              <option value="catalog">Catalogue</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={20} /> Ajouter à l'agenda
        </button>
      </form>
    </div>
  );
}