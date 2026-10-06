// app/users/components/users.client.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users as UsersIcon,
  ShieldCheck,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { CreateUserModal } from "./components/create-user-modal";
import { EditUserModal } from "./components/edit-user-modal";
import type { POSConfig } from "../types/pos";
import type { ResCompany } from "../types/odoo";
import type { UserRole } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface EnhancedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  assigned_shops: string[];
  assigned_companies: number[];
  shop_access_type: "all" | "specific";
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  created_at_auth?: string;
  email_confirmed_at?: string;
  is_online?: boolean;
  phone?: string;
}

interface UsersClientProps {
  initialUsers: EnhancedUser[];
  shops: POSConfig[];
  companies: ResCompany[];
  search?: string;
  roleFilter?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const HEADER_BG =
  "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

type BadgeTone = "emerald" | "amber" | "rose" | "sky" | "violet" | "neutral";

const ROLE_TONE: Record<string, BadgeTone> = {
  admin: "rose",
  manager: "sky",
  financier: "emerald",
  controller: "violet",
  "inventory-manager": "amber",
  inventory_manager: "amber",
  user: "neutral",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  financier: "Financier",
  controller: "Contrôleur",
  "inventory-manager": "Gestionnaire Stock",
  inventory_manager: "Gestionnaire Stock",
  user: "Utilisateur",
};

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  emerald:
    "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60",
  amber:
    "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60",
  rose:
    "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60",
  sky:
    "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60",
  violet:
    "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200/60 dark:border-violet-800/60",
  neutral: "text-muted-foreground bg-muted/40 border-border/60",
};

const PAGE_SIZE_DEFAULT = 25;

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: string }) {
  const tone = ROLE_TONE[role] ?? "neutral";
  const label = ROLE_LABEL[role] ?? role;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 text-[10px] font-semibold border",
        BADGE_TONE_CLASSES[tone],
      )}
    >
      {label}
    </Badge>
  );
}

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function UsersClient({
  initialUsers: users,
  shops,
  companies,
  search,
  roleFilter,
}: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EnhancedUser | null>(null);
  const [searchInput, setSearchInput] = useState(search ?? "");

  const debouncedSearch = useDebounced(searchInput, 350);

  // ─── Sync URL quand la recherche déboundée change ───────────────
  const pushFilter = useCallback(
    (updates: { search?: string; role?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const qs = params.toString();
      router.push(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if ((search ?? "") === debouncedSearch) return;
    pushFilter({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleRoleFilter = (value: string) => {
    pushFilter({ role: value });
  };

  const handleUserChanged = () => {
    router.refresh();
  };

  // ─── Columns ────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<EnhancedUser>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: () => "Utilisateur",
        cell: (info) => {
          const user = info.row.original;
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                {(user.full_name || user.email || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">
                  {user.full_name || "Non renseigné"}
                </div>
                <div className="text-[10px] text-muted-foreground/70 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: () => "Rôle",
        cell: (info) => <RoleBadge role={info.getValue() as string} />,
      },
      {
        id: "shopAccess",
        header: () => "Accès boutiques",
        cell: (info) => {
          const user = info.row.original;
          return user.shop_access_type === "all" ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Toutes
            </span>
          ) : (
            <span className="text-muted-foreground">
              {user.assigned_shops?.length ?? 0} boutique
              {(user.assigned_shops?.length ?? 0) > 1 ? "s" : ""}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: () => "Créé le",
        cell: (info) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: "last_sign_in_at",
        header: () => "Dernière connexion",
        cell: (info) => {
          const v = info.getValue() as string | undefined;
          return v ? (
            <span className="text-muted-foreground tabular-nums">
              {formatDate(v)}
            </span>
          ) : (
            <span className="text-muted-foreground/50 italic">Jamais</span>
          );
        },
      },
      {
        id: "actions",
        header: () => "Actions",
        cell: (info) => {
          const user = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(user)}
                className="h-6 px-2 text-[10px] gap-1 border-border/80 hover:bg-accent/60"
              >
                <Pencil className="w-3 h-3" />
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      "Êtes-vous sûr de vouloir supprimer cet utilisateur ?",
                    )
                  ) {
                    // TODO: suppression
                  }
                }}
                className="h-6 px-2 text-[10px] gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  // ─── Table instance ─────────────────────────────────────────────
  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: PAGE_SIZE_DEFAULT },
    },
  });

  const totalCount = users.length;

  return (
    <div>
      <ReportPageHeader
        title="Gestion des Utilisateurs"
        subtitle="Comptes, rôles et accès boutiques"
        badge={{ label: "Administration", tone: "violet" }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-7 w-56 pl-7 text-[11.5px] bg-secondary/60"
            />
          </div>

          <Select
            value={roleFilter ?? "all"}
            onValueChange={handleRoleFilter}
          >
            <SelectTrigger className="h-7 w-40 text-[11.5px] bg-secondary/60 rounded-lg">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Tous les rôles
              </SelectItem>
              <SelectItem value="admin" className="text-xs">
                Administrateur
              </SelectItem>
              <SelectItem value="manager" className="text-xs">
                Manager
              </SelectItem>
              <SelectItem value="financier" className="text-xs">
                Financier
              </SelectItem>
              <SelectItem value="controller" className="text-xs">
                Contrôleur
              </SelectItem>
              <SelectItem value="inventory-manager" className="text-xs">
                Gestionnaire Stock
              </SelectItem>
              <SelectItem value="user" className="text-xs">
                Utilisateur
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ReportPageHeader>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Info bar */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UsersIcon className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
              {totalCount}
            </span>
            <span>utilisateur{totalCount > 1 ? "s" : ""}</span>
          </div>
          {(search || roleFilter) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>filtres actifs</span>
            </div>
          )}
        </div>

        <ReportSection
          index={1}
          title="Liste des utilisateurs"
          actions={
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Plus className="w-3 h-3" />
              Nouvel utilisateur
            </Button>
          }
        >
          {users.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
              <UsersIcon className="w-6 h-6 mx-auto text-muted-foreground/40" />
              <h3 className="text-[12px] font-semibold text-foreground mt-2">
                {search
                  ? "Aucun utilisateur trouvé"
                  : "Aucun utilisateur"}
              </h3>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                {search
                  ? "Aucun résultat ne correspond à votre recherche."
                  : "Commencez par créer votre premier utilisateur."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                  <TableHeader className={HEADER_BG}>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow
                        key={hg.id}
                        className={cn("border-none", HEADER_BG)}
                      >
                        {hg.headers.map((header, idx) => (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto",
                              idx === 0 && "text-left min-w-[220px]",
                              idx === hg.headers.length - 1 &&
                              "text-right min-w-[140px]",
                              idx > 0 &&
                              idx < hg.headers.length - 1 &&
                              "text-center min-w-[110px]",
                              HEADER_BG,
                            )}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>

                  <TableBody className="divide-y divide-border/40">
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="hover:bg-accent/30 transition-colors border-b border-border/40"
                      >
                        {row.getVisibleCells().map((cell, idx) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "py-2 px-3",
                              idx === 0 && "text-left",
                              idx ===
                              row.getVisibleCells().length -
                              1 && "text-right",
                              idx > 0 &&
                              idx <
                              row.getVisibleCells()
                                .length -
                              1 &&
                              "text-center",
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <DataTablePagination
                table={table}
                totalRows={users.length}
                rowLabel="utilisateur"
              />
            </div>
          )}
        </ReportSection>
      </div>

      {/* Modales */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserChanged}
        shops={shops}
        companies={companies}
      />
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={handleUserChanged}
          shops={shops}
          companies={companies}
        />
      )}
    </div>
  );
}