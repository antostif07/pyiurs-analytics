import Link from "next/link";

const SEGMENTS = [
    { id: "femme", label: "Femme" },
    { id: "beauty", label: "Beauty" },
    { id: "enfant", label: "Enfant" },
] as const;

type Props = {
    current: string;
    from: string;
    to: string;
    hsCodes: string[];
    suppliers: string[];
};

function buildHref(
    segment: string,
    { from, to, hsCodes, suppliers }: Omit<Props, "current">,
) {
    const sp = new URLSearchParams({ segment, from, to });
    if (hsCodes.length) sp.set("hs_codes", hsCodes.join(","));
    if (suppliers.length) sp.set("suppliers", suppliers.join(","));
    return `?${sp.toString()}`;
}

export function SegmentTabs(props: Props) {
    const { current, ...rest } = props;
    return (
        <div className="bg-card p-1 rounded-lg border border-border shadow-sm text-sm flex overflow-x-auto max-w-full">
            {SEGMENTS.map((s) => {
                const active = current === s.id;
                return (
                    <Link
                        key={s.id}
                        href={buildHref(s.id, rest)}
                        className={`flex-1 text-center whitespace-nowrap px-3 md:px-4 py-1.5 rounded transition-colors ${active
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                    >
                        {s.label}
                    </Link>
                );
            })}
        </div>
    );
}