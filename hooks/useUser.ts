import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      // Attendre la session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return null;
      }

      const user = session.user;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(profileError);
      }

      return {
        ...user,
        profile,
      };
    },

    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}