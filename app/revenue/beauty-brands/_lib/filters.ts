import type { BeautyBrandsFilter } from "./types";

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function getDefaultBeautyFilters(): BeautyBrandsFilter {
    const now = new Date();
    return {
        boutique: "all",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
    };
}

export function parseBeautyFilters(raw: Raw): BeautyBrandsFilter {
    const def = getDefaultBeautyFilters();
    const bRaw = one(raw.boutique)?.trim();
    const mRaw = Number(one(raw.month));
    const yRaw = Number(one(raw.year));

    return {
        boutique: bRaw && /^\d+$/.test(bRaw) ? bRaw : "all",
        month: Number.isInteger(mRaw) && mRaw >= 1 && mRaw <= 12 ? mRaw : def.month,
        year: Number.isInteger(yRaw) && yRaw >= 2020 && yRaw <= 2100 ? yRaw : def.year,
    };
}

export function serializeBeautyFilters(f: BeautyBrandsFilter): URLSearchParams {
    const sp = new URLSearchParams();
    if (f.boutique !== "all") sp.set("boutique", f.boutique);
    sp.set("month", String(f.month));
    sp.set("year", String(f.year));
    return sp;
}