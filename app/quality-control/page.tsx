import { Suspense } from "react";
import QCTable from "./components/QCTable";
import { Loader2, ShieldCheck } from "lucide-react";
import { format, subDays } from "date-fns";
import { getAvailableHSCodes, getProductQualityData } from "./actions";
import BackButton from "@/components/BackButton";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import SearchFilter from "@/components/SearchFilter";
import HSCodeMultiSelect from "./components/HSCodeMultiSelect";

export const metadata = { title: "Contrôle Qualité • Pyiurs Admin" };

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    segment?: string;
    hs_codes?: string;
  }>;
};

export default async function QualityControlPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const from = params.from || format(subDays(new Date(), 7), "yyyy-MM-dd");
  const to = params.to || format(new Date(), "yyyy-MM-dd");
  const segment = params.segment || "femme";
  const hsCodes = params.hs_codes ? params.hs_codes.split(',') : [];

  const [data, availableHSCodes] = await Promise.all([
    getProductQualityData(from, to, segment, hsCodes),
    getAvailableHSCodes(from, to, segment)
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      
      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        
        {/* Titre + Retour */}
        <div className="flex items-center w-full xl:w-auto">
          <BackButton />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
              <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-emerald-600"/> 
              <span className="truncate">Contrôle Qualité</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 hidden md:block">
              Générez les fichiers d'import pour Odoo.
            </p>
          </div>
        </div>

        {/* Zone Filtres (S'empile sur mobile, s'aligne sur desktop) */}
        <div className="flex flex-col md:flex-row items-start md:items-end xl:items-center gap-3 w-full xl:w-auto">
           
           {/* Ligne 1 : Segments + Dates */}
           <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Sélecteur Segment */}
              <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm text-sm flex overflow-x-auto max-w-full">
                    <a href={`?segment=femme&from=${from}&to=${to}`} className={`flex-1 text-center whitespace-nowrap px-3 md:px-4 py-1.5 rounded ${segment === 'femme' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>Femme</a>
                    <a href={`?segment=beauty&from=${from}&to=${to}`} className={`flex-1 text-center whitespace-nowrap px-3 md:px-4 py-1.5 rounded ${segment === 'beauty' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>Beauty</a>
                    <a href={`?segment=enfant&from=${from}&to=${to}`} className={`flex-1 text-center whitespace-nowrap px-3 md:px-4 py-1.5 rounded ${segment === 'enfant' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}>Enfant</a>
              </div>
              
              {/* Date Filter (doit être responsive lui aussi idéalement, mais ici on le wrap) */}
              <div className="w-full sm:w-auto">
                <DateRangeFilter />
              </div>
           </div>

           {/* Ligne 2 : Recherche */}
           <div className="w-full md:w-auto">
                <HSCodeMultiSelect options={availableHSCodes} />
           </div>
           
        </div>
      </div>

      <Suspense key={hsCodes.join(',') + segment + from} fallback={<div className="h-64 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Recherche Odoo...</div>}>
         <QCTable data={data} />
      </Suspense>

    </main>
  );
}