import { Suspense } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { format, subDays } from "date-fns";
import HSCodeMultiSelect from "./components/HSCodeMultiSelect";
import SupplierMultiSelect from "./components/SupplierMultiSelect";
import { SegmentTabs } from "./components/SegmentTabs";
import { getProductQualityData, getAvailableFilters } from "./actions";
import BackButton from "@/components/BackButton";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import QCTableServer from "./components/QCTableServer";

export const metadata = { title: "Contrôle Qualité • Pyiurs Admin" };

type SearchParams = {
  from?: string;
  to?: string;
  segment?: string;
  hs_codes?: string;
  suppliers?: string;
};

type PageProps = { searchParams: Promise<SearchParams> };

export default async function QualityControlPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const from = params.from || format(subDays(new Date(), 7), "yyyy-MM-dd");
  const to = params.to || format(new Date(), "yyyy-MM-dd");
  const segment = params.segment || "femme";
  const hsCodes = params.hs_codes ? params.hs_codes.split(",") : [];
  const suppliers = params.suppliers ? params.suppliers.split(",") : [];

  const [data, filters] = await Promise.all([
    getProductQualityData(from, to, segment, hsCodes, suppliers),
    getAvailableFilters(from, to, segment, hsCodes, suppliers),
  ]);

  const { hsCodes: availableHSCodes, suppliers: availableSuppliers } = filters;

  const suspenseKey = [segment, from, to, hsCodes.join(","), suppliers.join(",")].join("|");

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 md:px-6 md:py-6">

        {/* ── HEADER : 1 ligne, compact ───────────────────────── */}
        <header className="flex items-center gap-3 mb-4 min-w-0">
          <BackButton />
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-lg md:text-xl font-semibold truncate">
              Contrôle Qualité
            </h1>
            <span className="hidden lg:inline text-xs text-muted-foreground truncate">
              — Générez les fichiers d'import pour Odoo
            </span>
          </div>
        </header>

        {/* ── FILTRES : une barre en flex-wrap ────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 min-w-0">
          <SegmentTabs
            current={segment}
            from={from}
            to={to}
            hsCodes={hsCodes}
            suppliers={suppliers}
          />
          <DateRangeFilter />

          {/* Pousse les filtres à droite sur écran large */}
          <div className="hidden md:block flex-1" />

          <HSCodeMultiSelect options={availableHSCodes} />
          <SupplierMultiSelect options={availableSuppliers} />
        </div>

        {/* ── TABLE ───────────────────────────────────────────── */}
        <Suspense
          key={suspenseKey}
          fallback={
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-2 w-4 h-4" /> Recherche Odoo...
            </div>
          }
        >
          <QCTableServer
            from={from}
            to={to}
            segment={segment}
            hsCodes={hsCodes}
            suppliers={suppliers}
          />
        </Suspense>
      </div>
    </main>
  );
}