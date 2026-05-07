import { UserCheck, Users } from "lucide-react";
import StatCard from "./stat-card";

type Props = {
  stats: {
    totalRef: number;
    totalReturned: number;
    rate: number;
    target: number;
    missingForTarget: number;
  };
  periodName: string;
};

export default function RetentionStats({ stats, periodName }: Props) {
  const isTargetMet = stats.rate >= stats.target;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-900 dark:text-white">
      
      {/* MAIN CARD */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">
              Cohorte <span className="text-indigo-600">{periodName}</span>
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Objectif {stats.target}%
            </p>
          </div>

          <div className={`p-4 rounded-3xl font-black text-2xl italic ${
            isTargetMet 
              ? 'text-emerald-500 bg-emerald-50' 
              : 'text-rose-500 bg-rose-50'
          }`}>
            {stats.rate}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-1000"
            style={{ width: `${stats.rate}%` }}
          />
          <div
            className="absolute top-0 h-full w-[2px] bg-red-500"
            style={{ left: `${stats.target}%` }}
          />
        </div>

        {!isTargetMet && (
          <p className="text-xs text-slate-500 mt-3">
            Il manque{" "}
            <span className="font-bold text-rose-500">
              {stats.missingForTarget}
            </span>{" "}
            clients pour atteindre l'objectif.
          </p>
        )}
      </div>

      {/* SIDE CARDS */}
      <div className="space-y-4">
        <StatCard label="Base clients" value={stats.totalRef} icon={Users} />
        <StatCard label="Clients revenus" value={stats.totalReturned} icon={UserCheck} color="text-emerald-500" />
      </div>
    </div>
  );
}