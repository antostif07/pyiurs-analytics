// src/components/dashboard/ModuleCard.tsx
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import React from "react";
import type { ModuleData } from "../../config/dashboard-theme";

interface ModuleCardProps {
  mod: ModuleData;
}

export const ModuleCard = React.memo(function ModuleCard({ mod }: ModuleCardProps) {
  const Icon = mod.icon;
  const isActive = mod.status === "active";
  const shouldReduceMotion = useReducedMotion();

  const isStock = mod.id === "stock";
  const alertCount = mod.alertsCount ?? 0;
  const hasAlerts = alertCount > 0;

  const cardContent = (
    <div className={`
      relative h-full bg-card border rounded-2xl p-6 transition-all duration-300 overflow-hidden flex flex-col justify-between
      ${isActive 
        ? hasAlerts 
          ? "border-amber-500/30 hover:border-amber-500 dark:border-amber-500/20" // Liseré orange d'alerte (1.7, 6.0)
          : "border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5" 
        : "border-border/40"
      }
    `}>
      {/* Filtre de Verre Dépoli */}
      {!isActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-500/5 dark:bg-black/30 backdrop-blur-[4px] transition-all duration-300 group-hover:backdrop-blur-[6px]">
          <div className="flex flex-col items-center gap-2.5">
            <div className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-border text-amber-500 shadow-md">
              <Lock className="w-4 h-4 animate-pulse" aria-hidden="true" />
            </div>
            <span className="text-xs font-bold tracking-wider px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-border text-foreground shadow-sm">
              Bientôt disponible
            </span>
          </div>
        </div>
      )}

      {isActive && (
        <div className={`absolute inset-0 bg-gradient-to-br ${mod.colorToken} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      )}

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className={`
              w-11 h-11 rounded-xl flex items-center justify-center shadow-md
              ${isActive ? `bg-gradient-to-br ${mod.colorToken} text-white` : "bg-slate-100 dark:bg-slate-800 text-slate-400"}
            `}>
              <Icon className="w-5.5 h-5.5" aria-hidden="true" />
            </div>
            
            {/* Coloration dynamique du Badge d'alertes (1.7) */}
            {isActive && (
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${isStock && !hasAlerts ? "animate-none" : "animate-pulse"}`}
                style={{
                  color: isStock && !hasAlerts ? "#10b981" : "#f59e0b", // Vert ou Orange d'alerte
                  borderColor: isStock && !hasAlerts ? "#10b98140" : "#f59e0b40",
                  backgroundColor: isStock && !hasAlerts ? "#10b98110" : "#f59e0b10",
                }}
              >
                {isStock && hasAlerts && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                {isStock && !hasAlerts ? "Stock OK" : mod.badge}
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-foreground mb-1.5">{mod.name}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5 min-h-[40px]">
            {mod.description}
          </p>
        </div>

        <div>
          {/* Stats section */}
          <div className="flex gap-6 mb-5 border-t border-border/40 pt-4">
            {mod.stats.map((s) => {
              const isAlertLabel = s.label.toLowerCase().includes("alerte");
              const statValue = isAlertLabel && !hasAlerts ? "0" : s.value;
              const statLabel = isAlertLabel && !hasAlerts ? "Sans Alerte" : s.label;

              return (
                <div key={s.label}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                    {statLabel}
                  </span>
                  <span className={`text-sm font-extrabold mt-0.5 block flex items-center gap-1 ${isAlertLabel && !hasAlerts ? "text-emerald-500" : isAlertLabel && hasAlerts ? "text-amber-500" : "text-foreground"}`}>
                    {isAlertLabel && !hasAlerts && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    {isAlertLabel && hasAlerts && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                    {statValue}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action CTA */}
          <div className="flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
            <span>Accéder au module</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }} // Désactivation stricte des variantes (1.6)
      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      {isActive ? (
        <Link 
          to={mod.href as any} 
          className="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl focus-visible:outline-none" // Focus visible (2.4)
          aria-label={`Ouvrir le module ${mod.name}. ${mod.description}. ${isStock && hasAlerts ? `${alertCount} alertes de stock en cours` : "Stock sécurisé"}`}
        >
          {cardContent}
        </Link>
      ) : (
        <div 
          className="group block h-full select-none"
          aria-label={`Module ${mod.name} en cours de développement`}
        >
          {cardContent}
        </div>
      )}
    </motion.div>
  );
});