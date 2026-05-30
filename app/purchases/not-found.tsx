"use client"
import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function PurchasesNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icône d'avertissement */}
      <div className="bg-muted p-4 rounded-full mb-6 text-muted-foreground">
        <FileQuestion className="h-12 w-12" />
      </div>

      {/* Message d'erreur */}
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Page non trouvée
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 text-sm">
        La page que vous recherchez dans le module des achats n'existe pas ou a été déplacée.
      </p>

      {/* Bouton de retour */}
      <Link
        href="/purchases"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la vue d'ensemble
      </Link>
    </div>
  );
}