"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  AlertTriangle,
  PackageMinus,
  Activity,
  Menu,
  Check,
  LogOut,
  User as UserIcon,
  Settings,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { NavGroup } from "./app-sidebar";

type TopbarProps = {
  dark: boolean;
  onToggleDark: () => void;
  onMenuOpen: () => void;
  groups?: NavGroup[];
};

/**
 * Hook d'écouteur universel pour intercepter les clics extérieurs (Click Outside)
 * sur l'ensemble du DOM (Layout, Sidebar, Main, Footer).
 */
function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    title: "Alerte de rupture",
    body: "Parfum Rose Exquise 100ml à Boutique Kinshasa — 2 unités restantes",
    time: "Il y a 2 min",
    read: false,
  },
  {
    id: "n2",
    icon: PackageMinus,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Avertissement Surstock",
    body: "Sérum Anti-Âge VIP à 390 unités — 3× au-dessus du seuil",
    time: "Il y a 18 min",
    read: false,
  },
  {
    id: "n3",
    icon: Activity,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Pics de ventes",
    body: "Extensions Cheveux Lisses : Ventes en hausse de +82%",
    time: "Il y a 1h",
    read: true,
  },
];

function useBreadcrumbs(groups?: NavGroup[]) {
  const pathname = usePathname();
  const crumbs = [{ label: "Accueil", path: "/" }];

  if (pathname === "/") return crumbs;

  if (groups && groups.length > 0) {
    const allItems = groups.flatMap((g) =>
      g.items.map((item) => ({ ...item, groupTitle: g.title }))
    );
    const match = allItems.find((i) => i.path === pathname);

    if (match) {
      crumbs.push({ label: match.groupTitle, path: "" });
      crumbs.push({ label: match.label, path: match.path });
      return crumbs;
    }
  }

  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";

  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const formattedLabel = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    crumbs.push({ label: formattedLabel, path: currentPath });
  });

  return crumbs;
}

export default function AppTopbar({ dark, onToggleDark, onMenuOpen, groups }: TopbarProps) {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  // ✅ Références pour cibler la zone des menus déroulants
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // ✅ Attachement des écouteurs de clics extérieurs globaux
  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  const breadcrumbs = useBreadcrumbs(groups);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Tableau de bord";

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-3 shrink-0 z-30 sticky top-0 transition-colors duration-150">

      {/* Bouton Hamburger Mobile */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Fil d'Ariane */}
      <div className="hidden sm:flex items-center gap-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path || i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
            <span
              className={cn(
                "text-xs truncate max-w-[140px] transition-colors",
                i === breadcrumbs.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground/70 hover:text-foreground cursor-pointer"
              )}
              onClick={() => crumb.path && router.push(crumb.path)}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      <div className="sm:hidden font-semibold text-xs text-foreground truncate">
        {currentPageTitle}
      </div>

      <div className="flex-1" />

      {/* Recherche Globale */}
      <div className="hidden md:flex items-center relative group">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Rechercher un rapport, produit, commande..."
          className="bg-muted/30 border border-border rounded-full pl-9 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 focus:bg-background transition-all w-64 focus:w-80"
        />
        <div className="absolute right-2.5 top-2 flex gap-0.5 pointer-events-none">
          <kbd className="text-[9px] text-muted-foreground/70 bg-background border border-border rounded px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Centre de Notifications avec Ref Click-Outside */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setNotifOpen((v) => !v);
            setProfileOpen(false);
          }}
          className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Centre de notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse" />
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden text-popover-foreground"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="text-xs font-semibold">Notifications</div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Badge className="text-[9px] bg-primary text-primary-foreground h-4 px-1.5 border-none font-bold">
                      {unreadCount}
                    </Badge>
                  )}
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5 font-medium"
                  >
                    <Check className="w-3 h-3" /> Tout marquer comme lu
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors cursor-pointer",
                      !n.read && "bg-accent/20"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", n.bg)}>
                      <n.icon className={cn("w-3.5 h-3.5", n.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{n.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2 font-light">
                        {n.body}
                      </div>
                    </div>
                    <div className="text-[9px] text-muted-foreground/60 shrink-0 font-light">{n.time}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Commutateur de Thème */}
      <button
        onClick={onToggleDark}
        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Changer le thème"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

      {/* Menu Profil Utilisateur avec Ref Click-Outside */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setProfileOpen((v) => !v);
            setNotifOpen(false);
          }}
          className="flex items-center gap-2.5 rounded-full hover:bg-accent/60 transition-all p-1 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-foreground text-background font-medium text-xs flex items-center justify-center border border-border shadow-sm group-hover:ring-2 group-hover:ring-primary/20 transition-all">
            {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="hidden md:block text-left pr-1">
            <div className="text-xs font-semibold text-foreground leading-none">
              {profile?.full_name || "Utilisateur"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-light">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="capitalize">{profile?.role || "Inconnu"}</span>
            </div>
          </div>
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-2xl shadow-2xl z-50 overflow-hidden text-popover-foreground"
            >
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Compte professionnel</p>
                <p className="text-xs font-medium text-foreground truncate mt-0.5">{user?.email}</p>
              </div>

              <div className="p-1.5">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/users");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer group font-light"
                >
                  <UserIcon className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                  Mon Profil
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer group font-light"
                >
                  <Settings className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                  Paramètres
                </button>
              </div>

              <div className="p-1.5 border-t border-border bg-muted/10">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion de la session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}