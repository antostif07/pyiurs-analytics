import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { UserRole } from "@/lib/constants";
import { HRClientShell } from "./hr-client-shell";

interface HRLayoutProps {
  children: React.ReactNode;
}

const HR_ALLOWED_ROLES: UserRole[] = ["admin", "financier"];

export default async function HRLayout({ children }: HRLayoutProps) {
  const cookieStore = await cookies();
  const headersList = await headers();

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
            // Ignoré dans un Server Component (le refresh est géré par proxy.ts)
          }
        },
      },
    }
  );

  // 3. Verrou de session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // ✅ Redirection dynamique grâce au header posé par proxy.ts
    const pathname = headersList.get("x-pathname") ?? "/hr";
    redirect(`/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  // 4. Récupération du profil avec gestion d'erreur explicite
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("[HR Layout] Impossible de charger le profil:", profileError);
    redirect("/login?error=profile_missing");
  }

  const userRole = (profile.role as UserRole) ?? "user";

  // ✅ 5. Contrôle d'accès basé sur le rôle
  if (!HR_ALLOWED_ROLES.includes(userRole)) {
    redirect("/"); // ou une page 403 dédiée
  }

  // 6. État de la sidebar (inchangé)
  const isCollapsed = cookieStore.get("hr_sidebar_collapsed")?.value === "true";

  return (
    <HRClientShell
      initialCollapsed={isCollapsed}
      userRole={userRole}
      userProfile={{
        fullName: profile.full_name || user.email || "Utilisateur",
        email: user.email || "",
        avatarUrl: profile.avatar_url || undefined,
      }}
    >
      {children}
    </HRClientShell>
  );
}