import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { UserRole } from "@/lib/constants";
import { HRClientShell } from "./_components/hr-client-shell";

interface HRLayoutProps {
  children: React.ReactNode;
}

export default async function HRLayout({ children }: HRLayoutProps) {
  // 1. Lecture des cookies serveur (pour l'authentification et l'état de la sidebar)
  const cookieStore = await cookies();

  // 2. Initialisation du client Supabase Côté Serveur
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignoré dans un Server Component
          }
        },
      },
    }
  );

  // 3. Verrou de sécurité Serveur : Vérification de la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/hr");
  }

  // 4. Récupération du profil et du rôle utilisateur dans Supabase
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  const userRole = (profile?.role as UserRole) || "user";

  // 5. Lecture du cookie pour éviter tout saut visuel (Zero Layout Shift)
  const isCollapsed = cookieStore.get("hr_sidebar_collapsed")?.value === "true";

  // 6. Rendu du Shell Client avec passage de données 100% sérialisables
  return (
    <HRClientShell
      initialCollapsed={isCollapsed}
      userRole={userRole}
      userProfile={{
        fullName: profile?.full_name || user.email || "Utilisateur",
        email: user.email || "",
        avatarUrl: profile?.avatar_url || undefined,
      }}
    >
      {children}
    </HRClientShell>
  );
}