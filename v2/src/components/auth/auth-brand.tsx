// src/components/auth/auth-brand.tsx
import {
  TrendingUp,
  BarChart3,
  Zap,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

type Stat = {
  title: string;
  value: string;
  trend?: string;
};

interface AuthBrandProps {
  company: string;
  slogan: string;

  hero: {
    title: string;
    description: string;
  };

  stats: Stat[];
  logo?: React.ReactNode;
}

export function AuthBrand({
  company,
  slogan,
  hero,
  stats,
  logo,
}: AuthBrandProps) {
  return (
    <div className="flex min-h-full flex-col justify-between text-foreground">
      
      {/* ================= HEADER (LOGO & NOM) ================= */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          {logo ?? <TrendingUp className="h-6 w-6" />}
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {company}
          </h1>
          <p className="text-xs text-muted-foreground">
            {slogan}
          </p>
        </div>
      </motion.div>

      {/* ================= HERO (PROMESSE DE VALEUR) ================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-8 space-y-4"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
          <Zap className="h-3 w-3" />
          Moteur d'analyse temps réel
        </div>

        <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
          {hero.title}
        </h2>

        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {hero.description}
        </p>
      </motion.div>

      {/* ================= KPI DASHBOARD (PROPRETÉ COMPACTE) ================= */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-8 grid grid-cols-3 gap-4"
      >
        {stats.map((stat) => {
          return (
            <motion.div
              key={stat.title}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="rounded-xl border border-border/50 bg-card/30 p-3.5 backdrop-blur-xl shadow-sm"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {stat.title}
                </span>
                <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>

              <div className="mt-2 text-lg font-extrabold tracking-tight">
                {stat.value}
              </div>

              {stat.trend && (
                <div className="mt-0.5 text-[10px] font-semibold text-emerald-500">
                  {stat.trend}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* ================= MINI CHART (DYNAMISME VISUEL) ================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 rounded-xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide">
              Flux analytique Odoo
            </span>
          </div>

          <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Synchro Active
          </span>
        </div>

        {/* SVG Chart compact */}
        <div className="mt-3 h-12 w-full">
          <svg
            viewBox="0 0 100 30"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="brand-chart-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <motion.path
              d="M0,22 C10,12 20,27 30,17 C40,7 50,22 60,12 C70,2 80,17 90,12 100,17"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2 }}
            />

            <motion.path
              d="M0,22 C10,12 20,27 30,17 C40,7 50,22 60,12 C70,2 80,17 90,12 100,17 L100,30 L0,30 Z"
              fill="url(#brand-chart-grad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
          </svg>
        </div>
      </motion.div>

      {/* ================= FOOTER ================= */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex items-center justify-between border-t border-border pt-4 text-[10px] font-medium text-muted-foreground"
      >
        <span>© 2026 {company}</span>

        <div className="flex gap-4">
          <span className="text-slate-500 dark:text-slate-400">Odoo v17 + Supabase</span>
        </div>
      </motion.div>
    </div>
  );
}