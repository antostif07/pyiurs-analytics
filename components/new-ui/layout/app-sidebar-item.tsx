"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "./app-sidebar";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SidebarItemProps = {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  isFav: boolean;
  onNavigate?: (path: string) => void;
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
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Dès que la page change, on éteint le micro-spinner
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleLinkClick = () => {
    if (!active && pathname !== item.path) {
      setIsNavigating(true);
    }
    // Callback optionnel pour fermer la recherche ou le menu mobile
    if (onNavigate) {
      onNavigate(item.path);
    }
  };

  const itemContent = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative flex items-center rounded-lg transition-all duration-150 select-none",
        collapsed
          ? "h-10 w-10 justify-center mx-auto"
          : "px-2.5 py-1.5 mx-2 w-[calc(100%-16px)]",
        active
          ? "bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-primary/20"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
      )}
    >
      {/* Barre d'activité verticale en mode étendu */}
      {active && !collapsed && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      {/* Lien principal de navigation (100% accessible) */}
      <Link
        href={item.path}
        onClick={handleLinkClick}
        className={cn(
          "flex items-center gap-2.5 flex-1 min-w-0 outline-none",
          collapsed && "justify-center w-full h-full"
        )}
      >
        {/* Micro-spinner de chargement immédiat ou Icône du module */}
        {isNavigating ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary stroke-[2]" />
        ) : (
          <item.icon
            className={cn(
              "w-4 h-4 shrink-0 transition-transform duration-200",
              active
                ? "text-primary scale-105"
                : "text-muted-foreground group-hover:scale-105 group-hover:text-sidebar-foreground"
            )}
          />
        )}

        {/* Titre et Badge en mode étendu */}
        {!collapsed && (
          <>
            <span className="flex-1 text-xs truncate tracking-wide font-light">
              {item.label}
            </span>

            {item.badge !== undefined && (
              <Badge
                variant="default"
                className="h-4 min-w-4 px-1 text-[9px] font-bold border-none shrink-0"
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>

      {/* Bouton Favori Découplé (Shadcn Button - Hors du Link pour conformité HTML5) */}
      {!collapsed && showFavToggle && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFav(item.id);
          }}
          className={cn(
            "h-6 w-6 p-0 hover:bg-primary/20 text-muted-foreground hover:text-foreground shrink-0 ml-1 transition-opacity duration-150",
            hovered || isFav ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Star
            className={cn(
              "w-3 h-3 transition-transform active:scale-125",
              isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60"
            )}
          />
        </Button>
      )}

      {/* Pastille de notification en mode réduit (Collapsed) */}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border-2 border-sidebar shadow-sm animate-pulse" />
      )}
    </div>
  );

  return (
    <div className="py-0.5">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={12}
            className="flex items-center gap-1.5 font-medium text-xs bg-popover text-foreground border border-border shadow-xl"
          >
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <Badge variant="secondary" className="text-[9px] h-3.5 px-1 font-bold">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        itemContent
      )}
    </div>
  );
}