import { Search } from "lucide-react";

interface EmptyStateProps {
  searchQuery: string;
  onClear: () => void;
}

export const EmptyState = ({ searchQuery, onClear }: EmptyStateProps) => (
  <div className="text-center py-16 px-4 bg-card rounded-3xl border border-border border-dashed transition-all duration-150">
    <Search className="mx-auto h-10 w-10 text-muted-foreground/40 mb-4 stroke-[1.5]" />
    <h3 className="text-md font-semibold tracking-tight mb-1">Aucun résultat trouvé</h3>
    <p className="text-xs text-muted-foreground font-light">
      {searchQuery ? `Aucun module opérationnel ne correspond à "${searchQuery}".` : "Vous ne disposez d'aucun accès affecté."}
    </p>
    {searchQuery && (
      <button
        onClick={onClear}
        className="mt-6 h-10 inline-flex items-center justify-center px-4 rounded-xl text-xs font-medium text-primary-foreground bg-primary hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
      >
        Effacer la recherche
      </button>
    )}
  </div>
);