import MarketingKpiGrid from "./_components/kpi-grid";
import MarketingAnalytics from "./_components/analytics-section";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      {/* Header avec Actions - Style SaaS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing Intelligence</h1>
          <p className="text-sm text-muted-foreground italic">Analyse de la performance et ROI publicitaire.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 border-border bg-card">
            <Filter className="w-4 h-4" /> Filtres
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 border-border bg-card">
            <Download className="w-4 h-4" /> Exporter
          </Button>
          <Button size="sm" className="rounded-xl gap-2 h-9 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Lancer une Campagne
          </Button>
        </div>
      </div>

      {/* KPI Grid Style Inventory */}
      <MarketingKpiGrid />

      {/* Analytics Section Style Inventory */}
      <MarketingAnalytics />

      {/* Section Campagnes Actives (Tableau simplifié pour l'Overview) */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Campagnes les plus performantes</h3>
          <Button variant="link" className="text-xs text-blue-500">Voir tout</Button>
        </div>
        <div className="space-y-4">
          {/* Exemple d'item de campagne rapide */}
          <CampaignQuickRow name="Promo Été - Facebook" spend="$1,200" roas="8.2x" status="Active" />
          <CampaignQuickRow name="WeShindi - Relance" spend="$450" roas="12.4x" status="Active" />
          <CampaignQuickRow name="Flash Sale - Lingwala" spend="$2,300" roas="4.1x" status="Paused" />
        </div>
      </div>
    </div>
  );
}

function CampaignQuickRow({ name, spend, roas, status }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex flex-col">
        <span className="text-xs font-bold">{name}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{status}</span>
      </div>
      <div className="flex items-center gap-8 text-right">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase">Dépenses</span>
          <span className="text-xs font-medium">{spend}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase">ROAS</span>
          <span className="text-xs font-bold text-emerald-500">{roas}</span>
        </div>
      </div>
    </div>
  );
}