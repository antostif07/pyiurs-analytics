export function TableSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Squelette de l'en-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-10 bg-gray-200 rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
          <div className="flex gap-4 mt-4 lg:mt-0">
            <div className="w-32 h-10 bg-gray-200 rounded-lg"></div>
            <div className="w-24 h-10 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Squelette des cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>

        {/* Squelette des tableaux */}
        <div className="space-y-6 animate-pulse">
          {[1, 2].map((table) => (
            <div key={table} className="bg-white dark:bg-slate-800 rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="flex gap-4">
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}