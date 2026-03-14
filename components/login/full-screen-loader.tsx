import { Loader2 } from "lucide-react";

export const FullScreenLoader = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
    <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium animate-pulse">
      Vérification de vos accès...
    </p>
  </div>
);