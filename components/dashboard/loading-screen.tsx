import { Loader2 } from "lucide-react";

export const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center transition-colors duration-150">
    <div className="flex flex-col items-center space-y-4">
      {/* Alignement avec le chargeur minimaliste rose signature de notre application */}
      <Loader2 className="animate-spin h-8 w-8 text-primary stroke-[1.5]" />
      <p className="text-muted-foreground text-xs font-light tracking-widest uppercase animate-pulse">
        Chargement de votre espace...
      </p>
    </div>
  </div>
);