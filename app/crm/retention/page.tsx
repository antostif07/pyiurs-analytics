import RetentionClient from "./retention-client";

export const metadata = {
  title: "Analyse de Rétention | CRM Dashboard",
  description: "Suivi de la récurrence client et objectif de 80% de retour.",
};

export default function RetentionPage() {
  return (
    <div className="text-foreground min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
              Analyse de <span className="text-indigo-600">Rétention</span>
            </h1>
            <p className="text-slate-500 font-medium tracking-wide">
              Mesurez la fidélité de vos clients et atteignez votre objectif de{" "}
              <span className="text-indigo-600 font-bold">80% de récurrence</span>.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-sm">
            <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cible Business :{" "}
              <span className="text-slate-900 dark:text-white">80.0%</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <RetentionClient />
      </div>
    </div>
  );
}