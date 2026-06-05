import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw error;

      console.log(user);


      // Optionnel : Récupérer des données extra depuis une table 'profiles'
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      return { ...user, profile };
    },
    staleTime: 1000 * 60 * 10, // Cache de 10 minutes
  });
}