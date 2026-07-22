import { AppModule } from "@/lib/constants";
import Link from "next/link";

interface ModuleCardProps {
  module: AppModule;
}

export const ModuleCard = ({ module }: ModuleCardProps) => {
  const Icon = module.icon;

  return (
    <Link
      href={module.href}
      className="group outline-none block h-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background rounded-2xl"
    >
      <div className="bg-card text-card-foreground rounded-2xl p-6 h-full border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden">

        {/* Entête de carte avec icône et badges d'état */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${module.color} text-white shadow-sm`}>
            <Icon size={20} strokeWidth={1.75} />
          </div>

          {/* Badges d'état fonctionnels (nouveautés ou tests) */}
          <div className="flex items-center space-x-1.5">
            {module.isNew && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20 animate-pulse">
                New
              </span>
            )}
            {module.isBeta && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Beta
              </span>
            )}
          </div>
        </div>

        {/* Titre réactif au survol de groupe */}
        <h3 className="text-md font-semibold tracking-tight mb-2 group-hover:text-primary transition-colors">
          {module.name}
        </h3>

        {/* Description sémantique limitée à 3 lignes pour préserver la grille de cartes */}
        <p className="text-xs text-muted-foreground font-light line-clamp-3 leading-relaxed flex-grow">
          {module.description}
        </p>
      </div>
    </Link>
  );
};