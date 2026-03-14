import { Search } from "lucide-react";

export const EmptyState = ({ searchQuery, onClear }: { searchQuery: string; onClear: () => void }) => (
  <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
    <Search className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Aucun résultat trouvé</h3>
    <p className="text-slate-500">
      {searchQuery ? `Aucun module ne correspond à "${searchQuery}".` : "Vous n'avez accès à aucun module."}
    </p>
    {searchQuery && (
      <button 
        onClick={onClear}
        className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Effacer la recherche
      </button>
    )}
  </div>
);