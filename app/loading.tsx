// components/ElegantLoading.tsx
export default function ElegantLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Carte de loading */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-pulse">
          {/* Avatar skeleton */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          
          {/* Contenu skeleton */}
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            <div className="h-4 bg-gray-300 rounded w-4/6"></div>
          </div>
          
          {/* Bouton skeleton */}
          <div className="mt-6 flex space-x-3">
            <div className="h-10 bg-gray-300 rounded-lg flex-1"></div>
            <div className="h-10 bg-gray-300 rounded-lg w-20"></div>
          </div>
        </div>
        
        {/* Indicateur de chargement */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Chargement en cours</span>
          </div>
        </div>
      </div>
    </div>
  );
}