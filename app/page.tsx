import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header Section */}
      <div className="container mx-auto px-4 pt-16 pb-8ß text-center">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Pyiurs Analytics
        </h1>
        {/* <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Plateforme d'analyse de données et de gestion business intelligente
        </p> */}
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          
          {/* Control Stock Beauty Card */}
          <Link href="/manager-kpis">
            <Card className="group relative p-6 h-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-300 dark:hover:border-blue-600 overflow-hidden">
              {/* Background Gradient Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col">
                {/* Icon */}
                <div className="mb-4 p-3 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    KPIS Manager
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    Suivi des depenses et epargnes
                  </p>
                </div>

                {/* Arrow Indicator */}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Accéder au module
                  </span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/control-stock-beauty">
            <Card className="group relative p-6 h-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-300 dark:hover:border-blue-600 overflow-hidden">
              {/* Background Gradient Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col">
                {/* Icon */}
                <div className="mb-4 p-3 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Control Stock Beauty
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    Gestion et analyse du stock pour produits de beauté avec indicateurs en temps réel
                  </p>
                </div>

                {/* Arrow Indicator */}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Accéder au module
                  </span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Card>
          </Link>

          {/* Additional Cards - Exemples pour d'autres modules */}
          <Card className="group p-6 h-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm opacity-70 hover:opacity-100 transition-all duration-300">
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="w-12 h-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm font-medium">Nouveau module à venir</p>
            </div>
          </Card>

          {/* Plus de cartes vides pour le layout */}
          <Card className="p-6 h-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm opacity-50">
            <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
              <div className="w-12 h-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm">Module en développement</p>
            </div>
          </Card>

          <Card className="p-6 h-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm opacity-50">
            <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
              <div className="w-12 h-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm">Module en développement</p>
            </div>
          </Card>

        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          © 2025 Pyiurs Analytics. Tous droits réservés.
        </p>
      </div>
    </main>
  );
}