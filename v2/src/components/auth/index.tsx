// src/components/auth/index.tsx
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, TrendingUp } from "lucide-react";

import { AuthLayout } from "./auth-layout";
import { AuthBrand } from "./auth-brand";
import { AuthCard } from "./auth-card";
import { ThemeSwitcher } from "../theme-switcher";

export function Auth({
  actionText,
  onSubmit,
  status,
  afterSubmit,
}: {
  actionText: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: "pending" | "idle" | "success" | "error";
  afterSubmit?: React.ReactNode;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = actionText.toLowerCase().includes("login");

  // Métriques de monitoring du portail d'entreprise de Pyiurs
  const analyticsStats = [
    {
      title: "Statut Synchro",
      value: "Actif",
      trend: "Odoo OK",
    },
    {
      title: "Indicateurs",
      value: "En continu",
      trend: "Temps réel",
    },
    {
      title: "Bases de données",
      value: "Double",
      trend: "Odoo + Supabase",
    },
  ];

  return (
    <AuthLayout
      rightTop={<ThemeSwitcher />}
      left={
        <AuthBrand
          company="Pyiurs Analytics"
          slogan="Portail Décisionnel Interne"
          logo={<TrendingUp className="h-6 w-6" />}
          hero={{
            title: "Suivi opérationnel & analyses de l'activité Pyiurs.",
            description:
              "Espace sécurisé réservé aux collaborateurs de l'entreprise. Centralisez le suivi logistique d'Odoo, pilotez les flux financiers de nos agences et visualisez nos indicateurs de performance clés.",
          }}
          stats={analyticsStats}
        />
      }
    >
      <AuthCard
        title={isLogin ? "Connexion" : "Créer un compte"}
        description={
          isLogin
            ? "Accédez à votre espace de travail sécurisé"
            : "Rejoignez la plateforme et commencez à automatiser votre activité"
        }
        footer={
          <div className="text-xs text-muted-foreground flex flex-col items-center gap-1">
            <span>Espace protégé par protocole de sécurité strict.</span>
            <span>
              Un problème de connexion ?{" "}
              <a href="mailto:it@pyiurs.com" className="text-primary font-semibold hover:underline">
                Contacter l'administrateur IT
              </a>
            </span>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          className="space-y-4"
        >
          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Adresse e-mail professionnelle
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <input
                name="email"
                type="email"
                placeholder="collaborateur@pyiurs.com"
                className="
                  w-full
                  rounded-xl
                  border
                  border-border/60
                  bg-background/60
                  pl-10
                  pr-3
                  py-3
                  text-sm
                  outline-none
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/20
                  transition
                "
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                Mot de passe
              </label>

              {isLogin && (
                <a
                  href="#"
                  className="text-xs text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </a>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="
                  w-full
                  rounded-xl
                  border
                  border-border/60
                  bg-background/60
                  pl-10
                  pr-10
                  py-3
                  text-sm
                  outline-none
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/20
                  transition
                "
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {afterSubmit && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {afterSubmit}
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={status === "pending"}
            className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-primary
              text-primary-foreground
              py-3
              text-sm
              font-semibold
              hover:opacity-90
              transition
              disabled:opacity-50
              cursor-pointer
            "
          >
            {status === "pending" ? (
              "Vérification des droits..."
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}