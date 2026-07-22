import { LoginInput, loginSchema } from "@/lib/validations/auth";
import { AlertCircle, Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

interface LoginFormProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LoginForm = ({ onSubmit, isLoading, error }: LoginFormProps) => {
  // ✅ 1. Un seul état pour toutes les données du formulaire
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: ''
  });

  // État visuel de l'UI (Masquage/Affichage mot de passe)
  const [showPassword, setShowPassword] = useState(false);

  // État de validation
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});

  // ✅ 2. Une seule fonction générique pour gérer tous les changements de saisie
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Mise à jour de la donnée correspondante au "name" de l'input
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'email' ? value.trim() : value // Nettoyage de l'email à la volée
    }));

    // Effacement de l'erreur de validation du champ en cours de saisie
    if (fieldErrors[name as keyof LoginInput]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    try {
      // Validation globale du schéma Zod
      loginSchema.parse(formData);

      // Transmission des données validées
      await onSubmit(formData.email, formData.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof LoginInput, string>> = {};
        err.issues.forEach((issue) => {
          const path = issue.path[0] as keyof LoginInput;
          if (path) {
            errors[path] = issue.message;
          }
        });
        setFieldErrors(errors);
      }
    }
  };

  return (
    <div className="bg-card text-card-foreground py-8 px-6 sm:rounded-2xl sm:px-10 shadow-lg border border-border w-full max-w-md">

      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Bon retour parmi nous
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 font-light">
          Entrez vos identifiants professionnels pour accéder aux données
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>

        {error && (
          <div
            className="bg-destructive/10 border-l-2 border-destructive p-3 rounded-md flex items-start"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 text-destructive mr-2.5 shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-medium leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Champ Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-foreground/80 mb-1.5">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
              </div>
              <input
                id="email"
                name="email" // Doit correspondre exactement à la clé dans formData
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                value={formData.email}
                onChange={handleChange} // ✅ Gestionnaire générique
                className={`block w-full pl-9 pr-3 py-2.5 border rounded-xl bg-muted/20 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.email ? 'border-destructive' : 'border-input'
                  }`}
                placeholder="votre@email.com"
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-destructive font-medium flex items-center animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-foreground/80 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
              </div>
              <input
                id="password"
                name="password" // Doit correspondre exactement à la clé dans formData
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={isLoading}
                value={formData.password}
                onChange={handleChange} // ✅ Gestionnaire générique
                className={`block w-full pl-9 pr-10 py-2.5 border rounded-xl bg-muted/20 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.password ? 'border-destructive' : 'border-input'
                  }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/60 hover:text-foreground focus:outline-none disabled:opacity-50"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-destructive font-medium flex items-center animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                {fieldErrors.password}
              </p>
            )}
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 flex justify-center items-center rounded-xl text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 active:scale-[0.98] focus:outline-none disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:transform-none transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" />
                Validation de la session...
              </>
            ) : (
              'Accéder à la plateforme'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};