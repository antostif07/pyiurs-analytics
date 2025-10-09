export function Loader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-300">Chargement des données...</span>
    </div>
  );
}