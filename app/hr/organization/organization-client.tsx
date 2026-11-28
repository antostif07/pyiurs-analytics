"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Building,
    ChevronDown,
    ChevronRight,
    Contact,
    Crown,
    GitBranch,
    Loader2,
    Search,
    UserCog,
    Users,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
    OrgEmployeeNode,
    OrgStructureData,
} from "./_lib/server/org-service";

function flattenNodes(nodes: OrgEmployeeNode[]): OrgEmployeeNode[] {
    const out: OrgEmployeeNode[] = [];
    const walk = (list: OrgEmployeeNode[]) => {
        for (const n of list) {
            out.push(n);
            walk(n.children);
        }
    };
    walk(nodes);
    return out;
}

function filterTree(
    nodes: OrgEmployeeNode[],
    q: string,
    shopId: string,
    deptId: string,
): OrgEmployeeNode[] {
    const query = q.trim().toLowerCase();
    const recurse = (list: OrgEmployeeNode[]): OrgEmployeeNode[] => {
        const res: OrgEmployeeNode[] = [];
        for (const node of list) {
            const keptChildren = recurse(node.children);
            const matchesShop = shopId === "all" || node.shopId === shopId;
            const matchesDept = deptId === "all" || node.departmentId === deptId;
            const matchesSearch =
                !query ||
                node.name.toLowerCase().includes(query) ||
                (node.jobTitle ?? "").toLowerCase().includes(query) ||
                (node.departmentName ?? "").toLowerCase().includes(query);

            if ((matchesShop && matchesDept && matchesSearch) || keptChildren.length > 0) {
                res.push({ ...node, children: keptChildren });
            }
        }
        return res;
    };
    return recurse(nodes);
}

export default function OrganizationClient({
    initialData,
    isAdmin,
}: {
    initialData: OrgStructureData;
    isAdmin: boolean;
}) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"employees" | "structure">("employees");
    const [search, setSearch] = useState("");
    const [shopFilter, setShopFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("all");
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    const [assignTarget, setAssignTarget] = useState<OrgEmployeeNode | null>(null);
    const [selectedManagerId, setSelectedManagerId] = useState<string>("auto");
    const [savingManager, setSavingManager] = useState(false);

    const flatEmployees = useMemo(() => flattenNodes(initialData.roots), [initialData.roots]);

    const visibleRoots = useMemo(
        () => filterTree(initialData.roots, search, shopFilter, deptFilter),
        [initialData.roots, search, shopFilter, deptFilter],
    );

    const toggleNode = (id: string) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleOpenAssign = (node: OrgEmployeeNode) => {
        setAssignTarget(node);
        setSelectedManagerId(node.explicitManagerId ?? "auto");
    };

    const handleSaveManager = async () => {
        if (!assignTarget) return;
        setSavingManager(true);
        try {
            const res = await fetch("/api/hr/organization/manager", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: assignTarget.id,
                    managerId: selectedManagerId === "auto" ? null : selectedManagerId,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error ?? "Erreur");
            toast.success("Supérieur hiérarchique mis à jour");
            setAssignTarget(null);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        } finally {
            setSavingManager(false);
        }
    };

    return (
        <div>
            <ReportPageHeader
                title="Organigramme RH"
                subtitle="Hiérarchie des agents générée depuis les relations Départements, Postes & Managers"
                badge={{ label: `${initialData.totalEmployees} agents`, tone: "sky" }}
                extraActions={
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode("employees")}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                                viewMode === "employees"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            Organigramme Agents
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("structure")}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                                viewMode === "structure"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            Structure Postes
                        </button>
                    </div>
                }
            >
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="relative w-56">
                        <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher agent, poste..."
                            className="w-full h-7 pl-7 pr-2.5 rounded-lg border border-border bg-secondary/60 text-[11px] focus:outline-none"
                        />
                    </div>

                    <Select value={shopFilter} onValueChange={setShopFilter}>
                        <SelectTrigger className="h-7 w-[150px] text-[11px] bg-secondary/60">
                            <SelectValue placeholder="Toutes boutiques" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Toutes boutiques</SelectItem>
                            {initialData.shops.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="h-7 w-[160px] text-[11px] bg-secondary/60">
                            <SelectValue placeholder="Tous départements" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Tous départements</SelectItem>
                            {initialData.departments.map((d) => (
                                <SelectItem key={d.id} value={d.id} className="text-xs">
                                    {d.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Agents Actifs"
                        value={String(initialData.totalEmployees)}
                        icon={<Users className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Départements"
                        value={String(initialData.departments.length)}
                        icon={<Building className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                    <CeoKpiCard
                        label="Liens N+1 déduits"
                        value={String(initialData.inferredLinks)}
                        subtitle="Via hiérarchie Postes/Dépts"
                        icon={<GitBranch className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Liens N+1 directs"
                        value={String(initialData.explicitLinks)}
                        subtitle="Définis manuellement"
                        icon={<Contact className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                    />
                </div>

                {viewMode === "employees" ? (
                    <ReportSection index={1} title="Arborescence hiérarchique des agents">
                        <div className="rounded-lg border border-border/60 bg-card p-4 space-y-2">
                            {visibleRoots.length === 0 ? (
                                <p className="py-8 text-center text-xs text-muted-foreground italic">
                                    Aucun agent trouvé pour ces critères.
                                </p>
                            ) : (
                                visibleRoots.map((root) => (
                                    <OrgTreeBranch
                                        key={root.id}
                                        node={root}
                                        depth={0}
                                        collapsedIds={collapsedIds}
                                        onToggle={toggleNode}
                                        isAdmin={isAdmin}
                                        onAssignManager={handleOpenAssign}
                                    />
                                ))
                            )}
                        </div>
                    </ReportSection>
                ) : (
                    <ReportSection index={1} title="Hiérarchie des Départements & Postes">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {initialData.departments.map((dept) => {
                                const deptPositions = initialData.positions.filter(
                                    (p) => p.departmentId === dept.id,
                                );
                                return (
                                    <div
                                        key={dept.id}
                                        className="rounded-lg border border-border/60 bg-card p-3.5 space-y-2"
                                    >
                                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                            <div>
                                                <p className="text-xs font-bold">{dept.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Niveau {dept.hierarchyLevel}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {deptPositions.length} poste(s)
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            {deptPositions.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center justify-between text-[11px] py-1"
                                                    style={{ paddingLeft: `${(p.hierarchyLevel - 1) * 12}px` }}
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {p.isDepartmentHead && (
                                                            <Crown className="w-3 h-3 text-amber-500" />
                                                        )}
                                                        <span className={p.isDepartmentHead ? "font-semibold" : ""}>
                                                            {p.title}
                                                        </span>
                                                    </span>
                                                    <Badge variant="secondary" className="h-4 px-1 text-[9px] font-mono">
                                                        N{p.hierarchyLevel}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ReportSection>
                )}
            </div>

            {/* Modal assignation N+1 explicite */}
            <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
                <DialogContent className="max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Définir le supérieur (N+1)</DialogTitle>
                        <DialogDescription className="text-xs">
                            Agent : <strong>{assignTarget?.name}</strong> ({assignTarget?.jobTitle || "—"})
                        </DialogDescription>
                    </DialogHeader>
                    <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Choisir un supérieur..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto" className="text-xs">
                                Automatique (via hiérarchie Poste / Département)
                            </SelectItem>
                            {flatEmployees
                                .filter((e) => e.id !== assignTarget?.id)
                                .map((e) => (
                                    <SelectItem key={e.id} value={e.id} className="text-xs">
                                        {e.name} {e.jobTitle ? `(${e.jobTitle})` : ""}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAssignTarget(null)} className="h-7 text-[11px]">
                            Annuler
                        </Button>
                        <Button size="sm" disabled={savingManager} onClick={handleSaveManager} className="h-7 text-[11px] gap-1.5">
                            {savingManager && <Loader2 className="w-3 h-3 animate-spin" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function OrgTreeBranch({
    node,
    depth,
    collapsedIds,
    onToggle,
    isAdmin,
    onAssignManager,
}: {
    node: OrgEmployeeNode;
    depth: number;
    collapsedIds: Set<string>;
    onToggle: (id: string) => void;
    isAdmin: boolean;
    onAssignManager: (node: OrgEmployeeNode) => void;
}) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);

    const LINK_BADGE: Record<OrgEmployeeNode["linkSource"], string | null> = {
        root: null,
        explicit: "Direct",
        position: "Via Poste",
        dept_head: "Chef Dépt.",
        parent_dept: "Dépt. Parent",
    };

    return (
        <div className={cn(depth > 0 && "ml-5 pl-3 border-l border-border/60")}>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/70 hover:bg-accent/30 px-3 py-2 my-1.5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => onToggle(node.id)}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                            )}
                        </button>
                    ) : (
                        <span className="w-4 shrink-0" />
                    )}

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {node.isDepartmentHead && (
                                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-foreground truncate">
                                {node.name}
                            </span>
                            {node.jobTitle && (
                                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                    {node.jobTitle}
                                </Badge>
                            )}
                            {node.departmentName && (
                                <span className="text-[10px] text-muted-foreground">
                                    · {node.departmentName}
                                </span>
                            )}
                            {node.shopName && (
                                <span className="text-[10px] text-sky-600 dark:text-sky-400">
                                    · {node.shopName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {LINK_BADGE[node.linkSource] && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground">
                            {LINK_BADGE[node.linkSource]}
                        </Badge>
                    )}
                    {hasChildren && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-mono">
                            {node.children.length}
                        </Badge>
                    )}
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAssignManager(node)}
                            title="Définir N+1"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                            <UserCog className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {hasChildren && !isCollapsed && (
                <div>
                    {node.children.map((child) => (
                        <OrgTreeBranch
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            collapsedIds={collapsedIds}
                            onToggle={onToggle}
                            isAdmin={isAdmin}
                            onAssignManager={onAssignManager}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}