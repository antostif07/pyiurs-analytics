// app/hr/employees/_components/EmployeeList.tsx
"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { 
  Search, MoreHorizontal, Link2, Link2Off, 
  MapPin, Hash, ChevronLeft, ChevronRight, Mail, Phone,
  Briefcase
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { EmployeeWithRelations } from "../../types";
import Link from "next/link";

export default function EmployeeList({ initialData, totalCount, currentPage }: { 
  initialData: EmployeeWithRelations[], 
  totalCount: number, 
  currentPage: number 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Mise à jour de l'URL pour les filtres
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1'); // Reset page si filtre change

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearch = useDebouncedCallback((term: string) => updateParams('query', term), 400);

  return (
    <div className={cn("space-y-4 transition-opacity", isPending && "opacity-60")}>
      {/* FILTRES DYNAMIQUES */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Rechercher par nom ou matricule..." 
            className="pl-11 h-11 border-none bg-slate-50 rounded-xl focus-visible:ring-rose-500 transition-all"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={searchParams.get("query")?.toString()}
          />
        </div>
        {/* Vous pourriez ajouter ici un sélecteur de Shop issu de votre table public.shops */}
      </div>

      {/* TABLEAU DATA-DENSE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center w-16">#</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Collaborateur</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Affectation</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Liaison Odoo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Salaire (Base)</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {initialData.map((emp, index) => (
              <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors group">
                <td className="px-6 py-4 text-center">
                    <span className="text-xs font-mono text-slate-300">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-300">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none mb-1">{emp.name}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><Hash size={10} /> {emp.matricule || 'N/A'}</span>
                        {emp.email && <span className="flex items-center gap-1 text-rose-500"><Mail size={10} /> Contact</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <MapPin size={13} className="text-rose-500" />
                            {emp.shops?.name || "Siège Social"}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-5">{emp.is_active ? 'Poste Actif' : 'Inactif'}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {emp.employee_odoo_id ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1.5 w-fit">
                      <Link2 size={12} /> Sync OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1.5 w-fit font-medium">
                      <Link2Off size={12} /> Orphelin
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700">
                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(emp.base_salary || 0))}
                   <p className="text-[9px] text-slate-400 font-sans mt-0.5">+ {emp.transport_allowance}$ transport</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100">
                        <MoreHorizontal size={18} className="text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-slate-100 p-2">
                      <DropdownMenuItem asChild>
                        <Link 
                          href={`/hr/employees/${emp.id}/edit`}
                          className="rounded-lg text-xs font-bold py-2.5 cursor-pointer flex items-center gap-2"
                        >
                          <Briefcase size={14} className="text-slate-400" />
                          Modifier le profil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-xs font-bold py-2.5 cursor-pointer">Voir le profil complet</DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-xs font-bold py-2.5 cursor-pointer text-blue-600">Lier à Odoo</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="rounded-lg text-xs font-bold py-2.5 cursor-pointer text-rose-600">Archiver l'employé</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* VIDE (EMPTY STATE) */}
        {initialData.length === 0 && (
            <div className="py-20 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Search size={32} />
                </div>
                <h3 className="text-slate-900 font-bold">Aucun employé trouvé</h3>
                <p className="text-slate-400 text-sm">Ajustez vos filtres ou créez une nouvelle fiche.</p>
            </div>
        )}
      </div>

      {/* PAGINATION ENTREPRISE */}
      {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 py-2">
            <p className="text-xs text-slate-500 font-medium">
                Affichage de <span className="text-slate-900">{initialData.length}</span> sur <span className="text-slate-900">{totalCount}</span> collaborateurs
            </p>
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1 || isPending}
                    onClick={() => updateParams('page', String(currentPage - 1))}
                    className="rounded-xl border-slate-200"
                >
                    <ChevronLeft size={16} /> Précédent
                </Button>
                <div className="flex items-center px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold">
                    {currentPage} / {totalPages}
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage >= totalPages || isPending}
                    onClick={() => updateParams('page', String(currentPage + 1))}
                    className="rounded-xl border-slate-200"
                >
                    Suivant <ChevronRight size={16} />
                </Button>
            </div>
          </div>
      )}
    </div>
  );
}