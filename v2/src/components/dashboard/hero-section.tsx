// src/components/dashboard/HeroSection.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../lib/contexts/auth-context";

export const HeroSection = React.memo(function HeroSection() {
  const { user, profile, loading } = useAuth();

  React.useEffect(() => {
    document.title = "Pyiurs Analytics | Portail Décisionnel Interne";
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse" role="status" aria-live="polite">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-8 w-64 bg-slate-300 dark:bg-slate-700 rounded" />
        <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
        <span className="sr-only">Initialisation du profil de session...</span>
      </div>
    );
  }

  const displayName = profile?.full_name 
    ? profile.full_name 
    : user?.email 
      ? user.email.split("@")[0] 
      : "Collaborateur";

  return (
    <motion.div
      className="space-y-2.5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">
        Portail Décisionnel Interne
      </p>
      {/* Rendu correct de la balise H1 sémantique unique sur la page (2.2) */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
        Bonjour, <span className="capitalize">{displayName}</span>
      </h1>
      <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
        Bienvenue sur le système d'information de l'entreprise **Pyiurs**. Sélectionnez un module analytique connecté pour piloter les flux en temps réel.
      </p>
    </motion.div>
  );
});