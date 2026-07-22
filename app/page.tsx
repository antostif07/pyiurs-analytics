"use client";

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
import { useTheme } from "next-themes";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  // Utilisation du gestionnaire de thème global next-themes
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const handleToggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark");

  // Redirection propre en cas de déconnexion client-side
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login'); // Évite les boucles de retour arrière
    }
  }, [user, loading, router]);

  // Filtrage réactif des modules autorisés
  const filteredModules = useMemo(() => {
    if (!profile?.role) return [];

    return MODULES_CONFIG.filter((module) => {
      const hasAccess = module.permissions.length === 0 || module.permissions.includes(profile.role as UserRole);
      const matchesSearch =
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase());

      return hasAccess && matchesSearch;
    });
  }, [searchQuery, profile?.role]);

  // Déconnexion
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('[LAUNCHER_ERROR] Échec de la déconnexion:', error);
    }
  };

  // ✅ Si l'initialisation de la session est en cours, ou s'il n'y a plus d'utilisateur connecté,
  // on affiche l'écran de chargement minimaliste pour éviter les flashes d'interface
  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-150">
      <DashboardHeader
        user={user}
        profile={profile}
        darkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onSignOut={handleSignOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Section Accueil & Barre de recherche */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Bonjour, {profile?.full_name?.split(' ')[0] || 'Bienvenue'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-light">
              Vous avez accès à {filteredModules.length} module{filteredModules.length > 1 ? 's' : ''} opérationnel{filteredModules.length > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="relative max-w-md w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-card text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Grille de modules */}
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