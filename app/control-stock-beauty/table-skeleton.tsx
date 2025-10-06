export function TableSkeleton() {
  return (
    <div className="p-4">
      <div className="space-y-3">
        {/* En-tête du tableau */}
        <div className="flex space-x-4 animate-pulse">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
          ))}
        </div>
        
        {/* Lignes du tableau */}
        {[...Array(10)].map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4 animate-pulse">
            {[...Array(7)].map((_, cellIndex) => (
              <div 
                key={cellIndex} 
                className={`h-12 bg-gray-100 dark:bg-gray-800 rounded ${
                  cellIndex === 0 ? 'flex-[2]' : 'flex-1'
                }`}
              ></div>
            ))}
          </div>
        ))}
        
        {/* Pagination skeleton */}
        <div className="flex justify-end space-x-2 pt-4 animate-pulse">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}