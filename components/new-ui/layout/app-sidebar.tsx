"use client";

import { useState, useRef, useEffect } from "react";
import { motion as FramerMotion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  X,
  LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarItem } from "./app-sidebar-item";
import { UserRole } from "@/lib/constants";

type SidebarProps = {
  role: UserRole;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  groups: NavGroup[];
  mainPath: string;
};

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
  roles?: UserRole[]; // ✅ Aligné sur les rôles réels du projet
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

const RECENT_PATHS = [
  "/inventory",
  "/cloture-vente",
  "/reports",
];

const LOCAL_STORAGE_FAVS_KEY = "pyiurs_dashboard_favorites";

export default function AppSidebar({ role, collapsed, onCollapse, groups, mainPath }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // ✅ Gestion sécurisée des favoris avec persistance locale sans avertissement d'hydratation
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Chargement des favoris au montage du composant client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FAVS_KEY);
      if (saved) {
        setFavorites(JSON.parse(saved));
      } else {
        // Favoris par défaut s'il s'agit du premier démarrage
        setFavorites(["revenue", "stock"]);
      }
    } catch {
      setFavorites(["revenue", "stock"]);
    }
  }, []);

  // Raccourci clavier Cmd+K / Ctrl+K pour focaliser la recherche
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!collapsed) searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed]);

  // Extraction de tous les éléments pour le moteur de recherche
  const allItems = groups.flatMap((g) => g.items);
  const filteredItems = search
    ? allItems.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) &&
      (!item.roles || item.roles.includes(role)) // ✅ Filtre la recherche selon les droits réels de l'utilisateur
    )
    : [];

  const isActive = (path: string) => {
    if (path === mainPath) {
      return pathname === mainPath;
    }
    return pathname.startsWith(path);
  };

  const isFav = (id: string) => favorites.includes(id);

  function toggleFav(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(LOCAL_STORAGE_FAVS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Échec d'écriture dans localStorage:", e);
      }
      return next;
    });
  }

  function navigateTo(path: string) {
    router.push(path);
    setSearch("");
  }

  const favItems = allItems.filter((i) => favorites.includes(i.id) && (!i.roles || i.roles.includes(role)));
  const recentItems = allItems.filter((i) => RECENT_PATHS.includes(i.path) && (!i.roles || i.roles.includes(role)));

  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <TooltipProvider delayDuration={200}>
      <FramerMotion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
        style={{ minWidth: sidebarWidth }}
      >
        {/* Entête Marque */}
        <div className="p-3 border-b border-sidebar-border">
          <div
            onClick={() => router.push("/")}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-xl p-2 hover:bg-sidebar-accent transition-colors cursor-pointer",
              collapsed && "justify-center"
            )}
          >
            {/* ✅ Logo unifié avec la charte graphique de la marque */}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 bg-primary">
              PY
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-semibold text-sidebar-foreground truncate">
                  Pyiurs
                </div>
                <div className="text-[10px] text-muted-foreground font-light">Enterprise</div>
              </div>
            )}
          </div>
        </div>

        {/* Moteur de recherche interne */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher… ⌘K"
                className="w-full bg-sidebar-accent border border-sidebar-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Liste déroulante des résultats de recherche */}
            <AnimatePresence>
              {filteredItems.length > 0 && (
                <FramerMotion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-3 right-3 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
                >
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.path)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors cursor-pointer text-left"
                    >
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground font-light">{item.label}</span>
                    </button>
                  ))}
                </FramerMotion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Section défilante de navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin">

          {/* Favoris persistés */}
          {!collapsed && favItems.length > 0 && !search && (
            <NavSection title="Favoris">
              {favItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={isActive(item.path)}
                  collapsed={false}
                  isFav={true}
                  onNavigate={navigateTo}
                  onToggleFav={toggleFav}
                />
              ))}
            </NavSection>
          )}

          {/* Récents */}
          {!collapsed && recentItems.length > 0 && !search && (
            <NavSection title="Récents" icon={<Clock className="w-3 h-3 text-muted-foreground" />}>
              {recentItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={isActive(item.path)}
                  collapsed={false}
                  isFav={isFav(item.id)}
                  onNavigate={navigateTo}
                  onToggleFav={toggleFav}
                  showFavToggle={false}
                />
              ))}
            </NavSection>
          )}

          {/* Groupes de navigation dynamiques */}
          {groups.map((group) => {
            // Filtrage des éléments basés sur les permissions de rôles strictes d'Odoo
            const visibleItems = group.items.filter(
              (item) => !item.roles || item.roles.includes(role)
            );

            if (visibleItems.length === 0) return null;

            return (
              <NavSection key={group.id} title={collapsed ? "" : group.title}>
                {visibleItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    active={isActive(item.path)}
                    collapsed={collapsed}
                    isFav={isFav(item.id)}
                    onNavigate={navigateTo}
                    onToggleFav={toggleFav}
                  />
                ))}
              </NavSection>
            );
          })}
        </div>

        {/* État de fonctionnement du système */}
        <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </TooltipTrigger>
              <TooltipContent side="right">Système opérationnel</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] text-muted-foreground font-light">Système opérationnel</span>
            </div>
          )}
        </div>

        {/* Bouton de repliement de la barre latérale */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center cursor-pointer hover:bg-accent transition-colors shadow-sm z-20 focus:outline-none"
          aria-label={collapsed ? "Agrandir la barre de navigation" : "Replier la barre de navigation"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </FramerMotion.aside>
    </TooltipProvider>
  );
}

function NavSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5">
      {title && (
        <div className="flex items-center gap-1.5 px-4 py-1.5">
          {icon}
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}