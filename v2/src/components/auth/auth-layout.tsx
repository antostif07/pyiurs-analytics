// src/components/auth/auth-layout.tsx
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  left?: ReactNode;
  rightTop?: ReactNode;
}

export function AuthLayout({
  children,
  left,
  rightTop,
}: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen md:h-screen md:max-h-screen md:overflow-hidden bg-background text-foreground flex flex-col">
      {/* Arrière-plan avec grille et lueurs */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="absolute -top-72 left-[-220px] h-[700px] w-[700px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="absolute -bottom-72 right-[-250px] h-[650px] w-[650px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />

      <div className="relative z-10 mx-auto flex flex-col md:flex-row min-h-screen md:h-full w-full max-w-[1700px]">
        
        {/* ================= PANNEAU GAUCHE (Marque & Identité) ================= */}
        {left && (
          <motion.aside
            initial={{
              opacity: 0,
              x: -40,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="
              hidden
              md:flex
              md:w-[45%]
              xl:w-[40%]
              shrink-0  /* <-- Empêche le panneau de s'écraser à 0px de largeur */
              h-full
              overflow-y-auto
              border-r
              border-border/60
              p-10
              xl:p-14
              scrollbar-none
            "
          >
            <div className="flex min-h-full w-full flex-col justify-between">
              {left}
            </div>
          </motion.aside>
        )}

        {/* ================= PANNEAU DROIT (Formulaire de saisie) ================= */}
        <section
          className="
            relative
            flex
            flex-1
            h-full
            overflow-y-auto
            items-center
            justify-center
            p-6
            sm:p-10
            md:p-12
            xl:p-16
          "
        >
          {/* Bouton de changement de thème ou d'action en haut à droite */}
          {rightTop && (
            <div className="absolute right-6 top-6 z-20">
              {rightTop}
            </div>
          )}

          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.15,
              duration: 0.5,
            }}
            className="
              w-full
              max-w-md
              py-8
              flex
              items-center
              justify-center
            "
          >
            {children}
          </motion.div>
        </section>
      </div>
    </main>
  );
}