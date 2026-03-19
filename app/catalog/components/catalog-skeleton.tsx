export default function CatalogSkeleton() {
  // On crée un tableau de 8 éléments factices pour remplir l'écran
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
      {skeletons.map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
          {/* Fausse Image */}
          <div className="aspect-square bg-slate-200 w-full"></div>
          
          {/* Fausses Infos */}
          <div className="p-4 flex flex-col flex-1 space-y-4">
            {/* Faux Titre */}
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
            
            {/* Fausses Spécifications */}
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="flex gap-2 pt-2">
                <div className="h-5 bg-slate-100 rounded w-16"></div>
                <div className="h-5 bg-slate-100 rounded w-20"></div>
              </div>
            </div>

            {/* Faux Prix */}
            <div className="mt-auto pt-4 border-t border-slate-50">
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}