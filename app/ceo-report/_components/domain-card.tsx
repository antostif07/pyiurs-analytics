import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DomainSummary } from "@/app/ceo-report/_lib/types";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import KpiCard from "./kpi-card";

interface DomainCardProps {
    domain: DomainSummary;
}

export function DomainCard({ domain }: DomainCardProps) {
    const Icon = domain.icon;

    return (
        <Card className="border-border/60 bg-card/40 transition-colors hover:border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            "bg-primary/10 text-primary"
                        )}
                    >
                        <Icon className="size-4" />
                    </div>

                    <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold text-foreground truncate">
                            {domain.label}
                        </CardTitle>
                        <CardDescription className="text-xs font-light mt-0.5 line-clamp-1">
                            {domain.description}
                        </CardDescription>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {domain.alertCount !== undefined && domain.alertCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="h-5 rounded-full px-2 text-[10px] font-semibold"
                        >
                            {domain.alertCount} alerte{domain.alertCount > 1 ? "s" : ""}
                        </Badge>
                    )}

                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="group h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        <Link href={domain.href}>
                            <span className="hidden sm:inline">Voir le détail</span>
                            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>

            {/* <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {domain.kpis.map((kpi) => (
                        <KpiCard key={kpi.code} kpi={kpi} variant="compact" />
                    ))}
                </div>
            </CardContent> */}
        </Card>
    );
}