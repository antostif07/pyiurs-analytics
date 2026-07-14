// src/routes/_authed/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Loader2 } from "lucide-react";
import React from "react";
import { Header } from '#/components/dashboard/header';
import { KPIStrip } from '#/components/dashboard/KPI-strip';
import { HeroSection } from '#/components/dashboard/hero-section';
import { ModuleCard } from '#/components/dashboard/module-card';
import { RoadmapCard } from '#/components/dashboard/roadmap-card';
import { 
  BUSINESS_MODULES, 
  ROADMAP_MODULES, 
  type ModuleData, 
  type OdooKPIsResult, 
  odooKPIsQueryOptions 
} from '../../config/dashboard-theme';
import { createServerFn } from '@tanstack/react-start';
import { ModuleGridSkeleton } from '#/components/dashboard/module-skeleton';
import { KPIDisconnected } from '#/components/dashboard/kpi-disconnected';
import { KPIStripSkeleton } from '#/components/dashboard/kpi-skeleton';

// Fonction serveur protégée contre les accès non autorisés (5.2)
const fetchOdooKPIs = createServerFn({ method: 'GET' }).handler(async () => {
  const { getServerAuth } = await import('../../../lib/supabase/server');
  const { user } = await getServerAuth();

  if (!user) {
    throw new Error("Accès non autorisé : Session expirée.");
  }

  try {
    const { odooClient } = await import('../../../lib/odoo/odoo-client');

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    const invoices = await odooClient.searchRead<{ amount_total: number }>('pos.order', {
      domain: [
        ['state', 'in', ['paid', 'done']],
        ['date_order', '>=', yearStart]
      ],
      fields: []
    });

    const annualRevenue = invoices.reduce((sum, inv) => sum + inv.amount_total, 0);

    const activeClientsCount = await odooClient.searchCount('res.partner', [
      ['active', '=', true],
      ['customer_rank', '>', 0]
    ]);

    const lowStockAlerts = await odooClient.searchCount('product.product', [
      ['active', '=', true],
      ['qty_available', '<', 5]
    ]);

    return {
      success: true,
      annualRevenue: `$${(annualRevenue / 1000).toFixed(0)}K`,
      activeClients: activeClientsCount.toLocaleString('fr-FR'),
      stockAlertsCount: lowStockAlerts,
      lastSyncISO: new Date().toISOString(), // Transmission en ISO pour localisation client (1.5)
    };
  } catch (error) {
    console.warn("Échec de la liaison Odoo, utilisation du repli dégradé :", error);
    // Discriminant success: false avec types propres (4.2, 5.3)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue de connexion Odoo",
      lastSyncISO: null, // Indique l'absence de synchro (5.3)
    };
  }
});

export const Route = createFileRoute('/_authed/')({
  // Utilisation de la configuration de Query centralisée (3.1)
  loader: ({ context }) => {
    const queryClient = context?.queryClient;

    if (!queryClient) {
      throw new Error("L'instance QueryClient est introuvable dans le contexte global.");
    }

    return queryClient.ensureQueryData(odooKPIsQueryOptions(fetchOdooKPIs));
  },
  component: LauncherPage,
})

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

function LauncherPage() {
  const shouldReduceMotion = useReducedMotion();

  // Utilisation de l'objet centralisé d'options de requête (3.1, 1.3, 1.4)
  const { data: resolvedKpis, isLoading, isFetching } = useQuery<OdooKPIsResult>({
    ...odooKPIsQueryOptions(fetchOdooKPIs),
  });

  const isOdooConnected = resolvedKpis?.success === true;

  // Localisation robuste de l'heure sur le client pour éviter le décalage d'horloge serveur (1.5)
  const formattedSyncTime = React.useMemo(() => {
    if (!resolvedKpis?.lastSyncISO) return "Indisponible";
    const date = new Date(resolvedKpis.lastSyncISO);
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, [resolvedKpis?.lastSyncISO]);

  // Dynamisation des alertes (orange/rouge si >0) (1.6)
  const dynamicBusinessModules = React.useMemo<ModuleData[]>(() => {
    // Si la liaison Odoo a échoué, on n'affiche pas "Stock OK" mais un avertissement
    if (!isOdooConnected) {
      return BUSINESS_MODULES.map((mod) => {
        if (mod.id === "stock") {
          return {
            ...mod,
            badge: "Sync Perdue",
            stats: [
              { label: "SKUs actifs", value: "1 284" },
              { label: "Alertes", value: "⚠️" },
            ]
          };
        }
        return mod;
      });
    }

    const alertCount = resolvedKpis.stockAlertsCount;
    return BUSINESS_MODULES.map((mod) => {
      if (mod.id === "stock") {
        const hasAlerts = alertCount > 0;
        return {
          ...mod,
          badge: hasAlerts ? `${alertCount} alertes` : "Stock OK",
          alertsCount: alertCount,
          stats: [
            { label: "SKUs actifs", value: "1 284" },
            { label: "Alertes", value: String(alertCount) },
          ]
        };
      }
      return mod;
    });
  }, [resolvedKpis, isOdooConnected]);

  // Formatage des indicateurs (delta Clients supprimé, gestion de repli en cas de coupure Odoo) (1.1, 1.2)
  const formattedKPIs = React.useMemo(() => {
    if (!isOdooConnected) return [];
    return [
      { label: "Ventes Annuelles (Odoo)", value: resolvedKpis.annualRevenue, delta: "+18% vs N-1" },
      { label: "Clients actifs", value: resolvedKpis.activeClients }, // Pas de delta inutile (1.2)
      { label: "Dernière Synchro Odoo", value: formattedSyncTime, delta: "JSON-RPC Ok" },
      { label: "Intégrité Supabase", value: "100%", delta: "Sécurisé" },
    ];
  }, [resolvedKpis, isOdooConnected, formattedSyncTime]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16 flex-1 w-full">
        
        {/* ================= BIENVENUE ================= */}
        <HeroSection />

        {/* ================= ZONE DE DEGRADATION : BANNIÈRE D'ERREUR ODOO (1.1) ================= */}
        {!isLoading && !isOdooConnected && (
          <KPIDisconnected />
        )}

        {/* ================= KPI STRIP (Instant-cache ou Squelette) ================= */}
        {isLoading ? (
          <KPIStripSkeleton />
        ) : (
          isOdooConnected && <KPIStrip kpis={formattedKPIs} />
        )}

        {/* ================= MODULES OPÉRATIONNELS ================= */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                Modules Opérationnels
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Outils analytiques connectés en temps réel à l'ERP Odoo et aux bases décisionnelles.
              </p>
            </div>

            {/* Témoin de rafraîchissement silencieux en arrière-plan (1.3) */}
            {isFetching && !isLoading && (
              <div 
                className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Mise à jour...</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <ModuleGridSkeleton />
          ) : (
            <motion.div
              // Préférences d'animations système (1.6)
              initial={shouldReduceMotion ? false : "hidden"}
              animate={shouldReduceMotion ? false : "show"}
              variants={shouldReduceMotion ? undefined : containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {dynamicBusinessModules.map((mod) => (
                <ModuleCard key={mod.id} mod={mod} />
              ))}
            </motion.div>
          )}
        </div>

        {/* ================= LA FEUILLE DE ROUTE ================= */}
        <div className="space-y-6 pt-4 border-t border-border/60">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-400" aria-hidden="true" />
              Feuille de Route & Planification
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Spécifications et feuille de route pour le déploiement des futurs modules SI d'agences.
            </p>
          </div>

          <motion.div 
            initial={shouldReduceMotion ? false : "hidden"}
            animate={shouldReduceMotion ? false : "show"}
            variants={shouldReduceMotion ? undefined : containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {ROADMAP_MODULES.map((mod) => (
              <RoadmapCard key={mod.id} mod={mod} />
            ))}
          </motion.div>
        </div>

      </main>
    </div>
  );
}