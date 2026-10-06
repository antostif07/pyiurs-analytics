// app/ceo-report/_components/report-section.tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Props = {
    /** Numéro affiché à gauche (1, 2, 3… ou "A", "B"…). Pad automatique si number. */
    index: number | string;
    /** Titre de la section — version COURTE, pas une phrase. */
    title: string;
    /** Lien "détail" optionnel vers la page dédiée. */
    href?: string;
    /** Label du lien (par défaut "détail"). */
    linkLabel?: string;
    /** Slot d'actions à droite (avant le lien) — filtres locaux, badge, etc. */
    actions?: React.ReactNode;
    children: React.ReactNode;
};

/**
 * Header de section pour les pages Cockpit.
 *
 * Design :
 *  - Densité maximale (aucune bordure lourde, aucun uppercase criard)
 *  - Palette sémantique respectée (text-foreground, text-muted-foreground)
 *  - Le numéro est en police mono pour aligner visuellement les sections
 */
export function ReportSection({
    index,
    title,
    href,
    linkLabel = "détail",
    actions,
    children,
}: Props) {
    const displayIndex =
        typeof index === "number" ? String(index).padStart(2, "0") : index;

    return (
        <section className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums shrink-0">
                    {displayIndex}
                </span>
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-foreground truncate">
                    {title}
                </h2>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                    {actions}
                    {href && (
                        <Link
                            href={href}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                        >
                            {linkLabel}
                            <ChevronRight className="w-3 h-3" />
                        </Link>
                    )}
                </div>
            </div>
            {children}
        </section>
    );
}