// src/components/dashboard/RoadmapCard.tsx
import { motion, useReducedMotion } from "framer-motion";
import { Calendar } from "lucide-react";
import React from "react";
import type { RoadmapModuleData } from "../../config/dashboard-theme";

interface RoadmapCardProps {
  mod: RoadmapModuleData;
}

export const RoadmapCard = React.memo(function RoadmapCard({ mod }: RoadmapCardProps) {
  const Icon = mod.icon;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-card/40 border border-dashed border-border/80 rounded-xl p-4 flex items-center justify-between hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
      aria-label={`Planification future: module ${mod.name}, prévu pour ${mod.quarter}`}
    >
      <div className="flex items-center gap-4">
        {/* Icône monochrome grisée masquée pour le lecteur d'écran (décorative) */}
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground/80 group-hover:text-foreground transition-colors flex items-center gap-1.5">
            {mod.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-1 max-w-sm">
            {mod.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800 border border-border/60 rounded-lg px-2 py-1">
        <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-muted-foreground">{mod.quarter}</span>
      </div>
    </motion.div>
  );
});