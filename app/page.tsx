"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/footer";

// Configuration des modules
const modules = [
  { 
    name: "KPI Manager",
    description: "KPI Manager",
    icon: "💵",
    color: "bg-purple-600",
    href: "/manager-kpis",
    permissions: ["admin", "manager"]
  },
  { 
    name: "Suivi des Ventes Beauty",
    description: "Suivi des Ventes Beauty",
    icon: "📊",
    color: "bg-teal-600",
    href: "/control-revenue-beauty",
    permissions: ["admin", "manager", "user"]
  },
  {
    name: "Suivi du Stock Beauty",
    description: "Suivi du Stock Beauty",
    icon: "📦",
    color: "bg-orange-500",
    href: "/control-stock-beauty",
    permissions: ["admin", "manager", "user"]
  },
  {
    name: "Suivi du Stock Femme",
    description: "Suivi du Stock Femme",
    icon: "📦",
    color: "bg-yellow-500",
    href: "/control-stock-femme",
    permissions: ["admin", "manager", "user"]
  },
  {
    name: "Suivi du Epargne Femme",
    description: "Suivi de l'Épargne Femme",
    icon: "💶",
    color: "bg-blue-500",
    href: "/suivi-epargne-femme",
    permissions: ["admin", "manager", "user"]
  },
  { 
    name: "Suivi Epargne Beauty",
    description: "KPI Manager",
    icon: "💵",
    color: "bg-purple-600",
    href: "/suivi-epargne-beauty",
    permissions: ["admin", "manager"]
  },
  {
    name: "Control Image Produit",
    description: "Contrôle des Images Produits",
    icon: "🖼️",
    color: "bg-emerald-700",
    href: "/control-product-image",
    permissions: ["admin", "manager", "user"]
  },
  {
    name: "Gestion des Clients",
    description: "Gestion des Clients",
    icon: "👥",
    color: "bg-indigo-600",
    href: "/client-base",
    permissions: ["admin", "manager", "user"]
  },
  {
    name: "Gestion des Clients Beauty",
    description: "Gestion des Clients Beauty",
    icon: "👥",
    color: "bg-blue-600",
    href: "/client-base-beauty",
    permissions: ["admin", "manager"]
  },
  {
    name: "Parc Client",
    description: "Parc Client",
    icon: "👥",
    color: "bg-green-600",
    href: "/parc-client",
    permissions: ["admin", "manager"]
  },
  {
    name: "Gestion de fonds",
    description: "Gestion des Fonds",
    icon: "💸",
    color: "bg-green-700",
    href: "/funds",
    permissions: ["admin", "manager-full"]
  },
  {
    name: "Revenu Global",
    description: "Revenu Global",
    icon: "📈",
    color: "bg-indigo-700",
    href: "/revenue",
    permissions: ["admin", "financier" ]
  },
  {
    name: "Suivi Vente agent",
    description: "Suivi des ventes par agent",
    icon: "📈",
    color: "bg-emerald-400",
    href: "/suivi-vente-agent",
    permissions: ["admin"]
  },
  {
    name: "Gestion Drive",
    description: "Créez et gérez vos documents dynamiques type Excel",
    href: "/gestion-drive",
    icon: "📊",
    color: "bg-blue-500",
    permissions: ["admin", "user", "manager", "financier"]
  },
  {
    name: "Clôtures de Caisse",
    description: "Gérez les clôtures quotidiennes de caisse",
    href: "/cloture-vente",
    icon: "💰",
    color: "bg-green-500",
    permissions: ["admin", "manager", "financier"]
  },
  {
    name: "Cash Flow",
    description: "Suivi des flux de trésorerie",
    href: "/cash-flow",
    icon: "💰",
    color: "bg-green-500",
    permissions: ["admin", "financier"]
  },
  {
    name: "Rapports",
    description: "Consultez les rapports et statistiques",
    href: "/reports",
    icon: "📈",
    color: "bg-purple-500",
    permissions: ["admin", "manager"]
  },
  {
    name: "Marketing",
    description: "Suivi et Rapports Marketing",
    href: "/marketing",
    icon: "📈",
    color: "bg-purple-500",
    permissions: ["admin", "manager"]
  },
  {
    name: "Utilisateurs",
    description: "Gérez les utilisateurs et permissions",
    href: "/users",
    icon: "👥",
    color: "bg-orange-500",
    permissions: ["admin"]
  }
];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  
  // Rediriger vers login si non authentifié
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Vérifier si l'utilisateur a accès à un module
  const hasAccessToModule = (modulePermissions: string[]) => {
    if (!profile?.role) return false;
    if (modulePermissions.length === 0) return true;
    return modulePermissions.includes(profile.role);
  };

  // Filtrer les modules selon les permissions
  const filteredModules = modules.filter(module => {
    const hasAccess = hasAccessToModule(module.permissions);
    const matchesSearch = module.name.toLowerCase().includes(search.toLowerCase()) ||
                         module.description.toLowerCase().includes(search.toLowerCase());
    return hasAccess && matchesSearch;
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 transition-colors`}>
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo et titre */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                Tableau de Bord
              </h1>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full whitespace-nowrap">
                {profile?.role === 'admin' ? 'Administrateur' : 
                 profile?.role === 'manager' ? 'Manager' : 
                 profile?.role === 'financier' ? 'Financier' : 'Utilisateur'}
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={darkMode ? "Mode clair" : "Mode sombre"}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              
              <div className="flex items-center space-x-2 lg:space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-sm">
                  <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {profile?.full_name || 'Utilisateur'}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-2 py-1 lg:px-3 lg:py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 whitespace-nowrap"
                >
                  Déconnexion
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg"
              >
                ☰
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {profile?.full_name || 'Utilisateur'}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 text-center"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Welcome section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bonjour, {profile?.full_name?.split(' ')[0] || 'Bienvenue'} !
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Accédez à tous vos modules depuis cette interface. 
            {filteredModules.length > 0 && ` ${filteredModules.length} module(s) disponible(s)`}
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6 sm:mb-8">
          <div className="relative max-w-md mx-auto sm:mx-0">
            <input
              type="text"
              placeholder="Rechercher un module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-sm">🔍</span>
            </div>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {filteredModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="block group"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 h-full transform hover:-translate-y-1 flex flex-col">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg ${module.color} flex items-center justify-center text-white text-lg sm:text-xl`}>
                    {module.icon}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 transform group-hover:translate-x-0.5 text-sm sm:text-base">
                    →
                  </div>
                </div>
                
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 line-clamp-2 leading-tight">
                  {module.name}
                </h3>
                
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-grow line-clamp-2 sm:line-clamp-3">
                  {module.description}
                </p>
                
                {/* {module.permissions.length > 0 && (
                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                    {module.permissions.map(perm => (
                      <span
                        key={perm}
                        className={`px-1.5 py-0.5 text-xs rounded-full ${
                          perm === 'admin' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : perm === 'manager'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : perm === 'financier'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                )} */}
              </div>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {filteredModules.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {search ? "Aucun module trouvé" : "Aucun module disponible"}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto px-4">
              {search 
                ? "Aucun module ne correspond à votre recherche. Essayez d'autres termes."
                : "Aucun module n'est disponible avec votre niveau d'accès actuel."
              }
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 sm:mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer user={user} />
    </div>
  );
}

// Composant de chargement
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Chargement du tableau de bord...</p>
      </div>
    </div>
  );
}