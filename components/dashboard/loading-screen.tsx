export const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <p className="text-slate-500 text-sm font-medium">Chargement de votre espace...</p>
    </div>
  </div>
);