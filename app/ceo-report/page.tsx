import type { Metadata } from "next";
import ExecutiveCockpit from "./_components/executive-cockpit";
import { parseFilters } from "./_lib/filters";
import { getExecutiveCockpitData } from "./_lib/data/executive-cockpit";

type Props = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
    title: "Executive Cockpit · Pyiurs",
    description:
        "Vue consolidée de la performance Pyiurs : CA, budget, stock, clients et alertes clés.",
};

export default async function ExecutiveCockpitPage({ searchParams }: Props) {
    const raw = await searchParams;
    const filters = parseFilters(raw);
    const data = await getExecutiveCockpitData(filters);

    return <ExecutiveCockpit data={data} />;
}