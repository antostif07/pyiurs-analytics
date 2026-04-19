"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  X,
  CheckCircle,
  Building2,
  LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarItem } from "./app-sidebar-item";

type Role = "Admin" | "Manager" | "Staff";

type SidebarProps = {
  role: Role;
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
  roles?: ("Admin" | "Manager" | "Staff")[];
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

// const WORKSPACES = [
//   { id: "w1", name: "Acme Corp", initials: "AC", color: "bg-indigo-500" },
//   { id: "w2", name: "Beta Retail", initials: "BR", color: "bg-emerald-500" },
// ];

const RECENT_PATHS = [
  "/dashboard/inventory/stock",
  "/dashboard/sales/orders",
  "/dashboard/reports/stock",
];

export default function AppSidebar({ role, collapsed, onCollapse, groups, mainPath }: SidebarProps) {
  const pathname = usePathname();
  
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([
    "stock-overview",
    "orders",
  ]);
  // const [workspaceOpen, setWorkspaceOpen] = useState(false);
  // const [activeWorkspace, setActiveWorkspace] = useState(WORKSPACES[0]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K focuses search
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

  // All nav items flattened for search
  const allItems = groups.flatMap((g) => g.items);
  const filteredItems = search
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const isActive = (path: string) => {
    console.log(path, mainPath);
    
    if (path === mainPath) {
      return pathname === mainPath;
    }
    return pathname.startsWith(path);
  };
  const isFav = (id: string) => favorites.includes(id);

  function toggleFav(id: string) {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function navigateTo(path: string) {
    router.push(path);
    setSearch("");
  }

  const favItems = allItems.filter((i) => favorites.includes(i.id));
  const recentItems = allItems.filter((i) =>
    RECENT_PATHS.includes(i.path)
  );

  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
        style={{ minWidth: sidebarWidth }}
      >
        {/* ── Workspace switcher ── */}
        <div className="p-3 border-b border-sidebar-border">
          <div
            onClick={() => router.push("/")}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-xl p-2 hover:bg-sidebar-accent transition-colors cursor-pointer",
              collapsed && "justify-center"
            )}
          >
            <div
              className={"w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-emerald-500"}
            >
              PY
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-semibold text-sidebar-foreground truncate">
                    Pyiurs
                  </div>
                  <div className="text-[10px] text-muted-foreground">Enterprise</div>
                </div>
              </>
            )}
          </div>

          {/* Workspace dropdown */}
          {/* <AnimatePresence>
            {workspaceOpen && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute left-3 right-3 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden"
              >
                {WORKSPACES.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setWorkspaceOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent transition-colors cursor-pointer text-left"
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold",
                        ws.color
                      )}
                    >
                      {ws.initials}
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {ws.name}
                    </span>
                    {ws.id === activeWorkspace.id && (
                      <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
                <div className="border-t border-border px-3 py-2">
                  <button className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Add workspace
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence> */}
        </div>

        {/* ── Search ── */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search… ⌘K"
                className="w-full bg-sidebar-accent border border-sidebar-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 cursor-pointer"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            <AnimatePresence>
              {filteredItems.length > 0 && (
                <motion.div
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
                      <span className="text-xs text-foreground">{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Scrollable nav ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin">
          {/* Favorites */}
          {!collapsed && favItems.length > 0 && !search && (
            <NavSection title="Favorites">
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

          {/* Recent */}
          {!collapsed && recentItems.length > 0 && !search && (
            <NavSection title="Recent" icon={<Clock className="w-3 h-3" />}>
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

          {/* Nav groups */}
          {groups.map((group) => {
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

        {/* ── System status ── */}
        <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </TooltipTrigger>
              <TooltipContent side="right">System operational</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] text-muted-foreground">System operational</span>
            </div>
          )}
        </div>

        {/* ── Collapse toggle ── */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center cursor-pointer hover:bg-accent transition-colors shadow-sm z-20"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}

// ── NavSection ──────────────────────────────────────────────────────────────
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
    <div className="mb-1">
      {title && (
        <div className="flex items-center gap-1 px-4 py-1.5">
          {icon}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
