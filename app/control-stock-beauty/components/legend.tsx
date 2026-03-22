export function Legend() {
  return (
    <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-black rounded"></div><span className="text-gray-600 dark:text-gray-400">Rupture</span></div>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-red-500 rounded"></div><span className="text-gray-600 dark:text-gray-400">Critique</span></div>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div><span className="text-gray-600 dark:text-gray-400">Faible</span></div>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span className="text-gray-600 dark:text-gray-400">Bon</span></div>
      </div>
    </div>
  );
}