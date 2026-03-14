"use client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import Footer from "@/components/dashboard/footer";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { ModuleCard } from "@/components/dashboard/module-card";
import { useAuth } from "@/contexts/AuthContext";
import { MODULES_CONFIG, UserRole } from "@/lib/constants";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

export default function Home() {
  const[darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  
  // Sécurité : Redirection si non connecté
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  },[user, loading, router]);

  const filteredModules = useMemo(() => {
    if (!profile?.role) return[];

    return MODULES_CONFIG.filter((module) => {
      const hasAccess = module.permissions.length === 0 || module.permissions.includes(profile.role as UserRole);
      const matchesSearch = 
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return hasAccess && matchesSearch;
    });
  }, [searchQuery, profile?.role]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Rendu de sécurité : Chargement
  if (loading || !user) return <LoadingScreen />;

  // Rendu Principal
  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors`}>
      
      <DashboardHeader 
        user={user} 
        profile={profile} 
        darkMode={darkMode} 
        onToggleDarkMode={() => setDarkMode(!darkMode)} 
        onSignOut={handleSignOut} 
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Section Accueil & Barre de recherche */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Bonjour, {profile?.full_name?.split(' ')[0] || 'Bienvenue'}
            </h2>
            <p className="text-slate-500 mt-1">
              Vous avez accès à {filteredModules.length} module{filteredModules.length > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="relative max-w-md w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Grille ou État Vide */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredModules.map((module) => (
              <ModuleCard key={module.href} module={module} />
            ))}
          </div>
        ) : (
          <EmptyState searchQuery={searchQuery} onClear={() => setSearchQuery('')} />
        )}

      </main>

      <Footer />
    </div>
  );
}