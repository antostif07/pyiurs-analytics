import { Loader2 } from "lucide-react";

export const FullScreenLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center transition-colors duration-150">
    <div className="flex flex-col items-center space-y-4">
      {/* Utilisation de l'accent rose de la marque et d'un trait ultra-fin haut de gamme */}
      <Loader2 className="animate-spin h-8 w-8 text-pink-500 stroke-[1.5]" />
      <p className="text-muted-foreground text-xs font-light tracking-widest uppercase animate-pulse">
        Vérification de vos accès...
      </p>
    </div>
  </div>
);