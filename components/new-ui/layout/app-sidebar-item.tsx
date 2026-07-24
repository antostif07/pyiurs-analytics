"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // ✅ Récupération du chemin courant
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2 } from "lucide-react"; // ✅ Ajout de Loader2
import { cn } from "@/lib/utils";
import { NavItem } from "./app-sidebar";

export type SidebarItemProps = {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  isFav: boolean;
  onNavigate: (path: string) => void;
  onToggleFav: (id: string) => void;
  showFavToggle?: boolean;
};

export function SidebarItem({
  item,
  active,
  collapsed,
  isFav,
  onNavigate,
  onToggleFav,
  showFavToggle = true,
}: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // ✅ État de navigation instantanée
  const pathname = usePathname();

  // Dès que l'URL change (la nouvelle page est chargée), on stoppe le micro-spinner
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleLinkClick = () => {
    if (!active) {
      setIsNavigating(true); // ✅ Déclenche immédiatement le spinner au clic
    }
    onNavigate(item.path);
  };

  const renderItemContent = () => (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left outline-none",
        collapsed
          ? "h-10 w-10 justify-center mx-auto"
          : "px-3 py-2 mx-2 w-[calc(100%-16px)]",
        active
          ? "bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent/60"
      )}
    >
      {/* Indicateur d'activité */}
      {active && (
        <motion.div
          layoutId="active-pill"
          className={cn(
            "absolute bg-primary rounded-full",
            collapsed
              ? "inset-0 bg-primary/10 -z-10"
              : "left-0 top-2 bottom-2 w-1"
          )}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      {/* ✅ Icône avec bascule instantanée en Spinner de chargement si cliqué */}
      {isNavigating ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary stroke-[2]" />
      ) : (
        <item.icon
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            active ? "text-primary scale-110" : "text-muted-foreground group-hover:scale-110 group-hover:text-sidebar-foreground"
          )}
        />
      )}

      {/* Contenu textuel */}
      {!collapsed && (
        <>
          <span className="flex-1 text-xs truncate tracking-wide">
            {item.label}
          </span>

          {item.badge !== undefined && (
            <Badge className="h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground font-bold border-none shrink-0">
              {item.badge}
            </Badge>
          )}

          {/* Bouton Favori */}
          {showFavToggle && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: (hovered || isFav) ? 1 : 0,
                scale: (hovered || isFav) ? 1 : 0.8,
                pointerEvents: (hovered || isFav) ? "auto" : "none"
              }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFav(item.id);
              }}
              className="p-1 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer shrink-0 ml-auto"
              aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Star
                className={cn(
                  "w-3 h-3 transition-transform active:scale-125",
                  isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60"
                )}
              />
            </motion.button>
          )}
        </>
      )}

      {/* Point de notification en mode réduit */}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border-2 border-sidebar shadow-sm animate-pulse" />
      )}
    </motion.div>
  );

  return (
    <div className="py-0.5">
      <Link
        href={item.path}
        onClick={handleLinkClick}
        className="block w-full outline-none"
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {renderItemContent()}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-medium text-xs bg-popover text-foreground border border-border shadow-md">
              {item.label}
              {item.badge && <span className="ml-2 opacity-70">({item.badge})</span>}
            </TooltipContent>
          </Tooltip>
        ) : (
          renderItemContent()
        )}
      </Link>
    </div>
  );
}