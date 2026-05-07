import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  hint?: string; // 💡 optionnel (insight business)
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-indigo-600",
  hint,
}: StatCardProps) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
      
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            {label}
          </p>
          <h4 className="text-xl font-black italic tracking-tighter">
            {value}
          </h4>
        </div>
      </div>

      {/* 💡 Insight business */}
      {hint && (
        <p className="text-xs text-slate-500 leading-snug">
          {hint}
        </p>
      )}
    </div>
  );
}