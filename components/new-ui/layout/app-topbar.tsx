import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  ChevronRight,
  AlertTriangle,
  PackageMinus,
  Activity,
  Menu,
  Check,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { NAV_GROUPS } from "../../../app/inventory/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type TopbarProps = {
  dark: boolean;
  onToggleDark: () => void;
  onMenuOpen: () => void;
};

const NOTIFICATIONS = [
  {
    id: "n1",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950",
    title: "Critical: Low Stock",
    body: "Air Purifier at Shop Gamma — 27 units left",
    time: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    icon: PackageMinus,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
    title: "Warning: Overstock",
    body: "Smart LED Bulbs at 390 units — 3× above optimal",
    time: "18 min ago",
    read: false,
  },
  {
    id: "n3",
    icon: Activity,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
    title: "Unusual movement",
    body: "USB-C Cables outgoing spiked 82%",
    time: "1h ago",
    read: true,
  },
];

// Build breadcrumbs from current path
function useBreadcrumbs() {
  const pathname = usePathname();
  const allItems = NAV_GROUPS.flatMap((g) =>
    g.items.map((item) => ({ ...item, groupTitle: g.title }))
  );
  const match = allItems.find((i) => i.path === pathname);

  if (!match) return [{ label: "Dashboard", path: "/dashboard" }];

  const crumbs = [{ label: "Dashboard", path: "/dashboard" }];
  if (match.path !== "/dashboard") {
    crumbs.push({ label: match.groupTitle, path: "" });
    crumbs.push({ label: match.label, path: match.path });
  }
  return crumbs;
}

export default function AppTopbar({ dark, onToggleDark, onMenuOpen }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { data: user, isLoading: userLoading } = useUser();

  console.log("user", user);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const breadcrumbs = useBreadcrumbs();
  const unread = notifications.filter((n) => !n.read).length;
  const currentPage = breadcrumbs[breadcrumbs.length - 1].label;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-3 shrink-0 z-30 sticky top-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
      >
        <Menu className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Breadcrumb + page title */}
      <div className="hidden sm:flex items-center gap-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
            <span
              className={cn(
                "text-xs truncate max-w-[120px]",
                i === breadcrumbs.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Mobile: page title only */}
      <div className="sm:hidden font-semibold text-sm text-foreground truncate">
        {currentPage}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global search */}
      <div className="hidden md:flex items-center relative group">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          placeholder="Rechercher un produit, lot ou transfert..."
          className="bg-muted/50 border border-border rounded-full pl-8 pr-10 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all w-64 focus:w-80"
        />
        <div className="absolute right-2.5 top-2 flex gap-0.5">
          <kbd className="text-[10px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-sans">
            ⌘
          </kbd>
          <kbd className="text-[10px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-sans">
            K
          </kbd>
        </div>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => {
            setNotifOpen((v) => !v);
            setProfileOpen(false);
          }}
          className="relative p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive border-2 border-background" />
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-xs font-semibold text-foreground">Notifications</div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <Badge className="text-[9px] bg-destructive text-white h-4 px-1.5">
                      {unread}
                    </Badge>
                  )}
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors",
                      !n.read && "bg-accent/10"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", n.bg)}>
                      <n.icon className={cn("w-3 h-3", n.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">{n.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {n.body}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{n.time}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Theme toggle */}
      <button
        onClick={onToggleDark}
        className="p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
      >
        {dark ? (
          <Sun className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Moon className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => {
            setProfileOpen((v) => !v);
            setNotifOpen(false);
          }}
          className="flex items-center gap-2 rounded-full hover:bg-accent transition-all p-1 group cursor-pointer"
        >
          {userLoading ? (
            <Skeleton className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground text-xs font-bold border-2 border-background shadow-sm group-hover:ring-2 group-hover:ring-primary/20 transition-all">
              {user?.profile?.full_name?.substring(0, 2).toUpperCase() || "U"}
            </div>
          )}

          <div className="hidden md:block text-left pr-1">
            {userLoading ? (
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-12" />
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-foreground leading-none">
                  {user?.profile?.full_name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  {user?.profile?.role || "Utilisateur"}
                </div>
              </>
            )}
          </div>
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-4 py-4 bg-muted/30 border-b border-border">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Compte connecté</p>
                <p className="text-xs font-semibold text-foreground truncate mt-0.5">{user?.email}</p>
              </div>

              <div className="p-1.5">
                {[
                  { label: "Mon Profil", icon: User },
                  { label: "Paramètres", icon: Settings },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors group"
                  >
                    <item.icon className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="p-1.5 border-t border-border bg-muted/10">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
