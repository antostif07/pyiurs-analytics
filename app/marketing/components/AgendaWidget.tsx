'use client'

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, Circle, Trash2, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { addTask, deleteTask, toggleTask } from '../actions';

interface Task {
  id: string;
  title: string;
  status: string; // 'pending' | 'completed'
}

export default function AgendaWidget({ initialTasks }: { initialTasks: Task[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optimistic UI : On pourrait faire plus complexe, mais le revalidatePath de Next.js est rapide.
  // Pour l'instant, on affiche simplement les tâches reçues du serveur.
  
  const completedCount = initialTasks.filter(t => t.status === 'completed').length;
  const progress = initialTasks.length > 0 ? (completedCount / initialTasks.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* HEADER AVEC BARRE DE PROGRESSION */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={20} className="text-purple-600"/> Agenda du jour
          </h2>
          <span className="text-xs font-medium text-purple-600">
            {completedCount}/{initialTasks.length} fait
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
                className="h-full bg-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
            />
        </div>
      </div>

      {/* LISTE DES TÂCHES */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 max-h-[400px]">
        <AnimatePresence mode='popLayout'>
            {initialTasks.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center text-gray-400 text-sm py-8 italic"
                >
                    Rien de prévu ? Ajoute une tâche !
                </motion.div>
            )}

            {initialTasks.map((task) => (
            <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={clsx(
                    "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                    task.status === 'completed' 
                        ? "bg-gray-50 border-gray-100 opacity-60" 
                        : "bg-white border-gray-200 hover:border-purple-200 hover:shadow-sm"
                )}
            >
                {/* Zone cliquable pour cocher */}
                <div 
                    className="flex items-center gap-3 flex-1"
                    onClick={() => toggleTask(task.id, task.status)}
                >
                    <div className={clsx("transition-colors", task.status === 'completed' ? "text-green-500" : "text-gray-300 group-hover:text-purple-500")}>
                        {task.status === 'completed' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </div>
                    <span className={clsx("text-sm font-medium transition-all", task.status === 'completed' ? "text-gray-400 line-through" : "text-gray-700")}>
                        {task.title}
                    </span>
                </div>

                {/* Bouton supprimer (visible au survol) */}
                <button 
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 transition-opacity"
                >
                    <Trash2 size={16} />
                </button>
            </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* INPUT D'AJOUT */}
      <form 
        ref={formRef}
        action={async (formData) => {
            setIsSubmitting(true);
            await addTask(formData);
            formRef.current?.reset();
            setIsSubmitting(false);
        }}
        className="relative mt-auto pt-4 border-t border-gray-100"
      >
        <input 
            name="title"
            type="text" 
            placeholder="Nouvelle tâche..." 
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-purple-100 focus:bg-white transition-all outline-none"
            autoComplete="off"
        />
        <button 
            type="submit" 
            disabled={isSubmitting}
            className="absolute right-2 top-[calc(50%+8px)] -translate-y-1/2 p-1.5 bg-white text-purple-600 rounded-lg shadow-sm hover:bg-purple-50 disabled:opacity-50 transition-colors"
        >
            <Plus size={18} />
        </button>
      </form>
    </div>
  );
}