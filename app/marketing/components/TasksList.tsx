'use client'

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Trash2, Video, Camera, Megaphone, FileText, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { format, isToday, isTomorrow, isPast, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { deleteTask, toggleTask } from '../actions';

// Mapping icônes par type
const typeIcons: Record<string, any> = {
  video: { icon: Video, color: 'text-purple-500 bg-purple-50' },
  shoot: { icon: Camera, color: 'text-pink-500 bg-pink-50' },
  promo: { icon: Megaphone, color: 'text-orange-500 bg-orange-50' },
  catalog: { icon: FileText, color: 'text-blue-500 bg-blue-50' },
  general: { icon: CalendarDays, color: 'text-gray-500 bg-gray-50' },
};

export default function TasksList({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) return <div className="text-center py-20 text-gray-400">Aucune tâche planifiée</div>;

  // Grouper les tâches par date pour l'affichage
  const groupedTasks: Record<string, any[]> = {};
  
  tasks.forEach(task => {
    const dateKey = task.due_date.split('T')[0];
    if (!groupedTasks[dateKey]) groupedTasks[dateKey] = [];
    groupedTasks[dateKey].push(task);
  });

  return (
    <div className="space-y-8">
      {Object.entries(groupedTasks).map(([date, dayTasks]) => {
        const dateObj = new Date(date);
        
        // Titre de la date (Aujourd'hui, Demain, ou "Lundi 12 Oct")
        let dateLabel = format(dateObj, 'EEEE d MMMM', { locale: fr });
        if (isToday(dateObj)) dateLabel = "Aujourd'hui";
        else if (isTomorrow(dateObj)) dateLabel = "Demain";
        
        const isLate = isPast(dateObj) && !isToday(dateObj);

        return (
          <div key={date}>
            <h4 className={clsx("text-sm font-bold mb-3 capitalize", isLate ? "text-red-500" : "text-gray-500")}>
              {dateLabel} {isLate && "(En retard)"}
            </h4>
            
            <div className="space-y-3">
              {dayTasks.map((task) => {
                const typeConfig = typeIcons[task.task_type] || typeIcons.general;
                const Icon = typeConfig.icon;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                      "group flex items-center justify-between p-4 rounded-xl border transition-all",
                      task.status === 'completed' 
                        ? "bg-gray-50 border-transparent opacity-60" 
                        : "bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.status)}>
                      {/* Checkbox */}
                      <div className={clsx(task.status === 'completed' ? "text-green-500" : "text-gray-300 group-hover:text-blue-500")}>
                        {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </div>

                      {/* Icone Type */}
                      <div className={clsx("p-2 rounded-lg", typeConfig.color)}>
                        <Icon size={18} />
                      </div>

                      {/* Textes */}
                      <div>
                        <h5 className={clsx("font-medium", task.status === 'completed' && "line-through text-gray-400")}>
                          {task.title}
                        </h5>
                        <span className="text-xs text-gray-400 capitalize bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            {task.task_type}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-2 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}