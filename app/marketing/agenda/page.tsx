import { CalendarDays } from 'lucide-react';
import { getAllTasks } from '../actions';
import TasksList from '../components/TasksList';
import NewTaskForm from '../components/NewTaskForm';

export const metadata = {
  title: 'Agenda | Module Interne',
};

export default async function AgendaPage() {
  // Récupérer les données côté serveur
  const tasks = await getAllTasks();

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
             <CalendarDays className="text-blue-600" size={32} /> Planning & Tâches
          </h1>
          <p className="text-gray-500 mt-1">Organise les shootings, promos et tâches de l'équipe.</p>
        </div>
        <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{tasks.filter((t: any) => t.status === 'pending').length}</p>
            <p className="text-xs text-gray-500 uppercase font-semibold">Tâches en attente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE (2/3) : LA LISTE DES TÂCHES */}
        <div className="lg:col-span-2">
            <TasksList tasks={tasks} />
        </div>

        {/* COLONNE DROITE (1/3) : FORMULAIRE D'AJOUT */}
        <div className="h-fit">
            <NewTaskForm />
            
            {/* Petit bloc d'info supplémentaire (Optionnel) */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                💡 <strong>Astuce :</strong>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-blue-700/80">
                    <li>Planifiez les <strong>Shootings</strong> le Lundi.</li>
                    <li>Préparez les <strong>Promos</strong> 2 jours avant.</li>
                    <li>N'oubliez pas l'inventaire le Vendredi.</li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
}