"use client";

import { Users, UserCheck, Clock, AlertCircle } from "lucide-react";

// Définition du type pour les props
type OverviewData = {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  onLeave: number;
  recentActivity: { id: number; user: string; action: string; time: string }[];
};

export default function OverviewClient({ 
  data, 
  currentRange 
}: { 
  data: OverviewData; 
  currentRange: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Aperçu RH</h2>
        <span className="text-sm text-gray-500">Filtre: {currentRange}</span>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Employés" value={data.totalEmployees} icon={Users} color="bg-blue-500" />
        <KpiCard title="Présents" value={data.presentToday} icon={UserCheck} color="bg-emerald-500" />
        <KpiCard title="En Retard" value={data.lateToday} icon={Clock} color="bg-orange-500" />
        <KpiCard title="Absents/Congés" value={data.onLeave} icon={AlertCircle} color="bg-red-500" />
      </div>

      {/* Activité Récente */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Activité en temps réel</h3>
        <div className="space-y-3">
            {data.recentActivity.map((act) => (
                <div key={act.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{act.user}</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {act.action}
                        </span>
                        <span className="text-sm text-gray-500">{act.time}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
      <div className={`p-3 rounded-full ${color} text-white mr-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}