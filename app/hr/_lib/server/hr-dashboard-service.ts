import { createClient } from "@/lib/supabase/server";
import { isHrFullAccessRole } from "@/lib/auth/hr-roles";
import type { Profile } from "@/lib/supabase/types";
import {
    getDefaultHrDashboardFilters,
    type HrDashboardFilter,
} from "../filters";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HrCurrencyTotal {
    currency: string;
    amount: number;
}

export interface HrShopOption {
    id: string;
    name: string;
}

export interface HrTeamDashboardData {
    mode: "team";
    scopeLabel: string;
    date: string;
    month: number;
    year: number;
    selectedShop: string;
    shops: HrShopOption[];
    kpis: {
        activeEmployees: number;
        presentToday: number;
        lateToday: number;
        absentToday: number;
        unrecordedToday: number;
        payslipsTotal: number;
        payslipsValidatedOrPaid: number;
        payslipNetByCurrency: HrCurrencyTotal[];
        activeDebtsCount: number;
        activeDebtsTotal: number;
    };
    attendanceBreakdown: Array<{ status: string; label: string; count: number }>;
    recentLateEmployees: Array<{
        id: string;
        employeeName: string;
        shopName: string;
        checkIn: string | null;
        lateMinutes: number;
    }>;
}

export interface HrPersonalDashboardData {
    mode: "personal";
    date: string;
    employee: {
        id: string;
        name: string;
        matricule: string | null;
        jobTitle: string | null;
        department: string | null;
        shopName: string | null;
        workStartTime: string | null;
    } | null;
    todayAttendance: {
        status: string;
        checkIn: string | null;
        isLate: boolean;
        lateMinutes: number;
    } | null;
    recentAttendances: Array<{
        id: string;
        date: string;
        status: string;
        checkIn: string | null;
        isLate: boolean;
        lateMinutes: number;
    }>;
    recentPayslips: Array<{
        id: string;
        month: number;
        year: number;
        netPayable: number;
        currency: string;
        status: string;
    }>;
    activeDebtsTotal: number;
    activeDebtsCount: number;
}

export type HrDashboardData = HrTeamDashboardData | HrPersonalDashboardData;

function chunkArray<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

async function resolveManagerShopIds(profile: Profile): Promise<string[]> {
    const supabase = await createClient();

    const uuidList: string[] = [];
    const posIdList: number[] = [];

    if (Array.isArray(profile.assigned_shops)) {
        for (const item of profile.assigned_shops) {
            const s = String(item).trim();
            if (UUID_RE.test(s)) uuidList.push(s);
            else if (/^\d+$/.test(s)) posIdList.push(Number(s));
        }
    }

    const companyIds = Array.isArray(profile.assigned_companies)
        ? profile.assigned_companies
            .map((c) => Number(c))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];

    const shopIds = new Set<string>(uuidList);

    const lookups: Promise<void>[] = [];
    if (companyIds.length > 0) {
        lookups.push(
            (async () => {
                const { data } = await supabase
                    .from("shops")
                    .select("id")
                    .in("odoo_company_id", companyIds);
                for (const s of data ?? []) shopIds.add(s.id);
            })(),
        );
    }
    if (posIdList.length > 0) {
        lookups.push(
            (async () => {
                const { data } = await supabase
                    .from("shops")
                    .select("id")
                    .overlaps("odoo_pos_ids", posIdList);
                for (const s of data ?? []) shopIds.add(s.id);
            })(),
        );
    }

    await Promise.all(lookups);
    return Array.from(shopIds);
}

export async function fetchHrDashboardData(
    profile: Profile,
    rawFilters?: HrDashboardFilter,
): Promise<HrDashboardData> {
    const supabase = await createClient();
    const filters = rawFilters ?? getDefaultHrDashboardFilters();
    const role = profile.role ?? "user";

    const isFull = isHrFullAccessRole(role);
    const isManager = role === "manager";

    // ─── Vue personnelle (user / inventory-manager / inventory_manager) ──
    if (!isFull && !isManager) {
        const { data: empByUid } = await supabase
            .from("employees")
            .select("id, name, matricule, job_title, department, daily_work_start_time, shops(name)")
            .eq("user_id", profile.id)
            .maybeSingle();

        let emp = empByUid;
        if (!emp && profile.email) {
            const { data: empByEmail } = await supabase
                .from("employees")
                .select("id, name, matricule, job_title, department, daily_work_start_time, shops(name)")
                .ilike("email", profile.email)
                .maybeSingle();
            emp = empByEmail;
        }

        if (!emp) {
            return {
                mode: "personal",
                date: filters.date,
                employee: null,
                todayAttendance: null,
                recentAttendances: [],
                recentPayslips: [],
                activeDebtsTotal: 0,
                activeDebtsCount: 0,
            };
        }

        const [attRes, payRes, debtRes] = await Promise.all([
            supabase
                .from("attendances")
                .select("id, date, status, validated_status, check_in, is_late, arrival_late_minutes")
                .eq("employee_id", emp.id)
                .lte("date", filters.date)
                .order("date", { ascending: false })
                .limit(7),
            supabase
                .from("payslips")
                .select("id, month, year, net_payable, currency, status")
                .eq("employee_id", emp.id)
                .order("year", { ascending: false })
                .order("month", { ascending: false })
                .limit(3),
            supabase
                .from("employee_debts")
                .select("id, remaining_amount")
                .eq("employee_id", emp.id)
                .eq("status", "active"),
        ]);

        const attRows = attRes.data ?? [];
        const selectedDateRow = attRows.find((a) => a.date === filters.date) ?? null;
        const debts = debtRes.data ?? [];
        const shopObj = Array.isArray(emp.shops) ? emp.shops[0] : emp.shops;

        return {
            mode: "personal",
            date: filters.date,
            employee: {
                id: emp.id,
                name: emp.name,
                matricule: emp.matricule,
                jobTitle: emp.job_title,
                department: emp.department,
                shopName: shopObj?.name ?? null,
                workStartTime: emp.daily_work_start_time,
            },
            todayAttendance: selectedDateRow
                ? {
                    status: selectedDateRow.validated_status ?? selectedDateRow.status ?? "present",
                    checkIn: selectedDateRow.check_in,
                    isLate: Boolean(selectedDateRow.is_late),
                    lateMinutes: selectedDateRow.arrival_late_minutes ?? 0,
                }
                : null,
            recentAttendances: attRows.map((a) => ({
                id: a.id,
                date: a.date,
                status: a.validated_status ?? a.status ?? "present",
                checkIn: a.check_in,
                isLate: Boolean(a.is_late),
                lateMinutes: a.arrival_late_minutes ?? 0,
            })),
            recentPayslips: (payRes.data ?? []).map((p) => ({
                id: p.id,
                month: p.month,
                year: p.year,
                netPayable: Number(p.net_payable ?? 0),
                currency: p.currency ?? "USD",
                status: p.status ?? "draft",
            })),
            activeDebtsCount: debts.length,
            activeDebtsTotal: debts.reduce((s, d) => s + Number(d.remaining_amount ?? 0), 0),
        };
    }

    // ─── Vue équipe / globale (admin, financier, manager) ─────────────────
    const managerShopIds =
        !isFull && isManager && profile.shop_access_type !== "all"
            ? await resolveManagerShopIds(profile)
            : null;

    let shopsQuery = supabase.from("shops").select("id, name").order("name");
    if (managerShopIds !== null) {
        if (managerShopIds.length === 0) {
            return {
                mode: "team",
                scopeLabel: "Aucune boutique assignée",
                date: filters.date,
                month: filters.month,
                year: filters.year,
                selectedShop: "all",
                shops: [],
                kpis: {
                    activeEmployees: 0,
                    presentToday: 0,
                    lateToday: 0,
                    absentToday: 0,
                    unrecordedToday: 0,
                    payslipsTotal: 0,
                    payslipsValidatedOrPaid: 0,
                    payslipNetByCurrency: [],
                    activeDebtsCount: 0,
                    activeDebtsTotal: 0,
                },
                attendanceBreakdown: [],
                recentLateEmployees: [],
            };
        }
        shopsQuery = shopsQuery.in("id", managerShopIds);
    }

    const { data: shopsData, error: shopsErr } = await shopsQuery;
    if (shopsErr) console.error("[HR_DASHBOARD] shops query error:", shopsErr.message);

    const availableShops: HrShopOption[] = (shopsData ?? []).map((s) => ({
        id: s.id,
        name: s.name,
    }));

    const validSelectedShop =
        filters.shop !== "all" && availableShops.some((s) => s.id === filters.shop)
            ? filters.shop
            : availableShops.length === 1 && managerShopIds !== null
                ? availableShops[0].id
                : "all";

    let empQuery = supabase
        .from("employees")
        .select("id, name, shop_id, shops(name)")
        .neq("is_active", false);

    if (validSelectedShop !== "all") {
        empQuery = empQuery.eq("shop_id", validSelectedShop);
    } else if (managerShopIds !== null) {
        empQuery = empQuery.in("shop_id", managerShopIds);
    }

    const { data: employees, error: empErr } = await empQuery;
    if (empErr) console.error("[HR_DASHBOARD] employees query error:", empErr.message);

    const empList = employees ?? [];
    const empIds = empList.map((e) => e.id);
    const empMap = new Map(
        empList.map((e) => {
            const shopObj = Array.isArray(e.shops) ? e.shops[0] : e.shops;
            return [e.id, { name: e.name, shopName: shopObj?.name ?? "—" }];
        }),
    );

    const selectedShopObj = availableShops.find((s) => s.id === validSelectedShop);
    const scopeLabel = selectedShopObj
        ? selectedShopObj.name
        : isFull
            ? "Entreprise (Global)"
            : "Mes Boutiques";

    if (empIds.length === 0) {
        return {
            mode: "team",
            scopeLabel,
            date: filters.date,
            month: filters.month,
            year: filters.year,
            selectedShop: validSelectedShop,
            shops: availableShops,
            kpis: {
                activeEmployees: 0,
                presentToday: 0,
                lateToday: 0,
                absentToday: 0,
                unrecordedToday: 0,
                payslipsTotal: 0,
                payslipsValidatedOrPaid: 0,
                payslipNetByCurrency: [],
                activeDebtsCount: 0,
                activeDebtsTotal: 0,
            },
            attendanceBreakdown: [],
            recentLateEmployees: [],
        };
    }

    const isUnrestrictedQuery = validSelectedShop === "all" && managerShopIds === null;

    type AttRow = {
        id: string;
        employee_id: string;
        status: string | null;
        validated_status: string | null;
        check_in: string | null;
        is_late: boolean | null;
        arrival_late_minutes: number | null;
    };
    type PayRow = {
        id: string;
        net_payable: number | null;
        currency: string | null;
        status: string | null;
    };
    type DebtRow = {
        id: string;
        remaining_amount: number | null;
    };

    let dayAtts: AttRow[] = [];
    let payslips: PayRow[] = [];
    let debts: DebtRow[] = [];

    if (isUnrestrictedQuery) {
        // Vue globale : aucune clause .in() géante sur les UUID
        const [attRes, payRes, debtRes] = await Promise.all([
            supabase
                .from("attendances")
                .select("id, employee_id, status, validated_status, check_in, is_late, arrival_late_minutes")
                .eq("date", filters.date),
            supabase
                .from("payslips")
                .select("id, net_payable, currency, status")
                .eq("month", filters.month)
                .eq("year", filters.year),
            supabase
                .from("employee_debts")
                .select("id, remaining_amount")
                .eq("status", "active"),
        ]);

        if (attRes.error) console.error("[HR_DASHBOARD] attendances error:", attRes.error.message);
        if (payRes.error) console.error("[HR_DASHBOARD] payslips error:", payRes.error.message);
        if (debtRes.error) console.error("[HR_DASHBOARD] debts error:", debtRes.error.message);

        const empIdSet = new Set(empIds);
        dayAtts = (attRes.data ?? []).filter((a) => empIdSet.has(a.employee_id));
        payslips = payRes.data ?? [];
        debts = debtRes.data ?? [];
    } else {
        // Vue filtrée par boutique : chunking par 50 UUID pour ne jamais dépasser la taille max URL
        const chunks = chunkArray(empIds, 50);
        const [attBatches, payBatches, debtBatches] = await Promise.all([
            Promise.all(
                chunks.map((c) =>
                    supabase
                        .from("attendances")
                        .select("id, employee_id, status, validated_status, check_in, is_late, arrival_late_minutes")
                        .eq("date", filters.date)
                        .in("employee_id", c),
                ),
            ),
            Promise.all(
                chunks.map((c) =>
                    supabase
                        .from("payslips")
                        .select("id, net_payable, currency, status")
                        .eq("month", filters.month)
                        .eq("year", filters.year)
                        .in("employee_id", c),
                ),
            ),
            Promise.all(
                chunks.map((c) =>
                    supabase
                        .from("employee_debts")
                        .select("id, remaining_amount")
                        .eq("status", "active")
                        .in("employee_id", c),
                ),
            ),
        ]);

        dayAtts = attBatches.flatMap((r) => r.data ?? []);
        payslips = payBatches.flatMap((r) => r.data ?? []);
        debts = debtBatches.flatMap((r) => r.data ?? []);
    }

    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    const statusCounts = new Map<string, number>();

    for (const a of dayAtts) {
        const st = a.validated_status ?? a.status ?? "present";
        const isLateRow =
            Boolean(a.is_late) ||
            st === "late" ||
            Number(a.arrival_late_minutes ?? 0) > 0;

        statusCounts.set(st, (statusCounts.get(st) ?? 0) + 1);
        if (st === "present" || st === "tele_travail") presentToday += 1;
        else if (st === "late") presentToday += 1;
        else if (st === "absent") absentToday += 1;

        if (isLateRow) lateToday += 1;
    }

    const unrecordedToday = Math.max(0, empIds.length - dayAtts.length);

    const STATUS_LABELS: Record<string, string> = {
        present: "Présents",
        late: "En retard",
        absent: "Absents",
        tele_travail: "Télétravail",
        repos: "Repos",
        sick: "Maladie",
        conge_circonstanciel: "Congé circonstanciel",
        conge_non_circonstanciel: "Congé annuel",
        suspension: "Suspendus",
    };

    const attendanceBreakdown = [
        ...Array.from(statusCounts.entries()).map(([status, count]) => ({
            status,
            label: STATUS_LABELS[status] ?? status,
            count,
        })),
        ...(unrecordedToday > 0
            ? [{ status: "unrecorded", label: "Non pointés", count: unrecordedToday }]
            : []),
    ];

    const recentLateEmployees = dayAtts
        .filter(
            (a) =>
                Boolean(a.is_late) ||
                (a.validated_status ?? a.status) === "late" ||
                Number(a.arrival_late_minutes ?? 0) > 0,
        )
        .sort((a, b) => (b.arrival_late_minutes ?? 0) - (a.arrival_late_minutes ?? 0))
        .slice(0, 6)
        .map((a) => {
            const info = empMap.get(a.employee_id);
            return {
                id: a.id,
                employeeName: info?.name ?? "—",
                shopName: info?.shopName ?? "—",
                checkIn: a.check_in,
                lateMinutes: a.arrival_late_minutes ?? 0,
            };
        });

    const netByCur = new Map<string, number>();
    let payslipsValidatedOrPaid = 0;
    for (const p of payslips) {
        if (p.status === "validated" || p.status === "paid") {
            payslipsValidatedOrPaid += 1;
        }
        const cur = (p.currency || "USD").toUpperCase();
        netByCur.set(cur, (netByCur.get(cur) ?? 0) + Number(p.net_payable ?? 0));
    }

    return {
        mode: "team",
        scopeLabel,
        date: filters.date,
        month: filters.month,
        year: filters.year,
        selectedShop: validSelectedShop,
        shops: availableShops,
        kpis: {
            activeEmployees: empIds.length,
            presentToday,
            lateToday,
            absentToday,
            unrecordedToday,
            payslipsTotal: payslips.length,
            payslipsValidatedOrPaid,
            payslipNetByCurrency: Array.from(netByCur.entries()).map(([currency, amount]) => ({
                currency,
                amount,
            })),
            activeDebtsCount: debts.length,
            activeDebtsTotal: debts.reduce((s, d) => s + Number(d.remaining_amount ?? 0), 0),
        },
        attendanceBreakdown,
        recentLateEmployees,
    };
}