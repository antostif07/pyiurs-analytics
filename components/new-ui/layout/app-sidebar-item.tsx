"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
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

  // Le bouton principal réutilisé pour les deux modes
  const renderButton = () => (
    <motion.button
      onClick={() => onNavigate(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left",
        collapsed 
          ? "h-10 w-10 justify-center mx-auto" // Mode réduit : Carré centré
          : "px-3 py-2 mx-2 w-[calc(100%-16px)]", // Mode étendu
        active
          ? "bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
      )}
    >
      {/* Indicateur Actif (Pillule à gauche en étendu, fond complet en réduit) */}
      {active && (
        <motion.div
          layoutId="active-pill"
          className={cn(
            "absolute bg-primary rounded-full",
            collapsed 
              ? "inset-0 bg-primary/10 -z-10" // En réduit, c'est un fond subtil
              : "left-0 top-2 bottom-2 w-1"   // En étendu, c'est une barre à gauche
          )}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      {/* Icône avec animation de scale au survol */}
      <item.icon
        className={cn(
          "w-4 h-4 shrink-0 transition-transform duration-200",
          active ? "text-primary scale-110" : "text-muted-foreground group-hover:scale-110 group-hover:text-sidebar-foreground"
        )}
      />

      {/* Contenu visible uniquement en mode étendu */}
      {!collapsed && (
        <>
          <span className="flex-1 text-xs truncate tracking-wide">
            {item.label}
          </span>

          {item.badge !== undefined && (
            <Badge className="h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground font-bold border-none">
              {item.badge}
            </Badge>
          )}

          {showFavToggle && (hovered || isFav) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFav(item.id);
              }}
              className="p-0.5 rounded-md hover:bg-primary/20 transition-colors"
            >
              <Star
                className={cn(
                  "w-3 h-3",
                  isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                )}
              />
            </motion.div>
          )}
        </>
      )}

      {/* Point de notification rouge en mode réduit */}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border-2 border-sidebar shadow-sm" />
      )}
    </motion.button>
  );

  if (collapsed) {
    return (
      <div className="py-1 flex justify-center w-full">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {renderButton()}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-medium text-xs">
              {item.label}
              {item.badge && <span className="ml-2 opacity-70">({item.badge})</span>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return <div className="py-0.5">{renderButton()}</div>;
}