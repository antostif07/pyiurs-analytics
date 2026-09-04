"use client";

import React, { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { NavGroup } from "./app-sidebar";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TopbarProps = {
  dark: boolean;
  onToggleDark: () => void;
  onMenuOpen: () => void;
  groups?: NavGroup[];
};

const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    icon: AlertTriangle,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
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

  if (pathname === "/" || pathname === "/hr") {
    crumbs.push({ label: "Pilotage RH", path: "/hr" });
    return crumbs;
  }

  if (groups && groups.length > 0) {
    const allItems = groups.flatMap((g) =>
      g.items.map((item) => ({ ...item, groupTitle: g.title }))
    );
    const match = allItems.find((i) => i.path === pathname || pathname.startsWith(`${i.path}/`));

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
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const breadcrumbs = useBreadcrumbs(groups);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Tableau de bord";

  const handleSignOut = async () => {
    await signOut();
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const userInitial =
    profile?.full_name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    "U";

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-3 shrink-0 z-30 sticky top-0 transition-colors duration-150">
      {/* Bouton Hamburger Mobile (Shadcn Button) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuOpen}
        className="md:hidden text-muted-foreground hover:text-foreground"
        aria-label="Ouvrir le menu de navigation"
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Fil d'Ariane Dynamique */}
      <nav aria-label="Fil d'Ariane" className="hidden sm:flex items-center gap-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path || i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
            <span
              className={cn(
                "text-xs truncate max-w-[160px] transition-colors select-none",
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
      </nav>

      {/* Titre Page Mobile */}
      <div className="sm:hidden font-semibold text-xs text-foreground truncate">
        {currentPageTitle}
      </div>

      <div className="flex-1" />

      {/* Recherche Globale (Shadcn Input) */}
      <div className="hidden md:flex items-center relative group">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10" />
        <Input
          type="text"
          placeholder="Rechercher un employé, document, prime..."
          className="pl-9 pr-12 h-8 text-xs bg-muted/30 border-border rounded-full w-64 focus-visible:w-80 transition-all focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-background"
        />
        <div className="absolute right-2.5 top-2 flex gap-0.5 pointer-events-none">
          <kbd className="text-[9px] text-muted-foreground/70 bg-background border border-border rounded px-1 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Centre de Notifications (Shadcn Popover + ScrollArea) */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground h-9 w-9"
            aria-label="Centre de notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary border-2 border-background animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0 shadow-2xl rounded-xl border-border">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <span className="text-xs font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[9px] h-4 px-1.5 font-bold">
                  {unreadCount}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="h-6 text-[10px] text-primary hover:text-primary px-1.5 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Tout marquer comme lu
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-72">
            <div className="divide-y divide-border/40">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer text-left",
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
                  <span className="text-[9px] text-muted-foreground/60 shrink-0 font-light">
                    {n.time}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Commutateur de Thème (Shadcn Button) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleDark}
        className="text-muted-foreground hover:text-foreground h-9 w-9"
        aria-label="Changer de thème"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      {/* Séparateur Vertical Shadcn */}
      <Separator orientation="vertical" className="h-4 hidden sm:block mx-1" />

      {/* Menu Profil Utilisateur (Shadcn DropdownMenu + Avatar) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 rounded-full p-1 h-auto hover:bg-accent/60 transition-all group"
          >
            <Avatar className="w-8 h-8 border border-border group-hover:ring-2 group-hover:ring-primary/20 transition-all">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Avatar"} />}
              <AvatarFallback className="bg-foreground text-background text-xs font-medium">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <div className="hidden md:block text-left pr-1">
              <div className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                {profile?.full_name || "Utilisateur"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-light">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="capitalize">{profile?.role || "Agent"}</span>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 shadow-2xl rounded-xl border-border p-1.5">
          <DropdownMenuLabel className="px-3 py-2 bg-muted/30 rounded-lg mb-1">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              Compte professionnel
            </p>
            <p className="text-xs font-medium text-foreground truncate mt-0.5">
              {user?.email}
            </p>
          </DropdownMenuLabel>

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => router.push("/users")}
              className="text-xs cursor-pointer gap-2 py-2 text-muted-foreground hover:text-foreground font-light"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Mon Profil</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="text-xs cursor-pointer gap-2 py-2 text-muted-foreground hover:text-foreground font-light"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Paramètres</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-xs cursor-pointer gap-2 py-2 text-rose-500 hover:text-rose-500 hover:bg-rose-500/10 focus:text-rose-500 focus:bg-rose-500/10 font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion de la session</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}