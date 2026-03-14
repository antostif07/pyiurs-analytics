"use client"
import { FullScreenLoader } from "@/components/login/full-screen-loader";
import { LoginForm } from "@/components/login/login-form";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const[authError, setAuthError] = useState<string | null>(null);
  
  const { signIn, loading: isAuthInitializing } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent, email: string, pass: string) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const { error } = await signIn(email, pass);
      
      if (error) {
        // Personnalisation des messages d'erreur fréquents de Supabase
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('Email ou mot de passe incorrect.');
        } else {
          setAuthError(error.message || 'Erreur de connexion');
        }
      } else {
        // Optionnel : Forcer la redirection ici si l'AuthContext ne le fait pas assez vite
        router.push('/');
      }
    } catch (err) {
      // Typage propre de l'erreur catchée
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Une erreur inattendue est survenue au niveau du réseau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si l'AuthContext vérifie encore si un utilisateur existe
  if (isAuthInitializing) {
    return <FullScreenLoader />;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo ou Titre de la marque */}
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
          Pyiurs Analytics
        </h1>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md flex justify-center">
        <LoginForm 
          onSubmit={handleLogin} 
          isLoading={isSubmitting} 
          error={authError} 
        />
      </div>

      {/* Footer minimaliste de la page de login */}
      <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} Pyiurs Analytics. Accès restreint.
      </div>
    </main>
  );
}