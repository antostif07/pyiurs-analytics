import { useQuery } from "@tanstack/react-query"
import { MODULES_CONFIG, AppModule, UserRole } from "@/lib/constants"

export function useModules(role?: UserRole) {
  return useQuery<AppModule[]>({
    queryKey: ["modules", role],
    queryFn: async () => {
      return MODULES_CONFIG
    },
    select: (modules) => {
      return modules
        .filter((m) => {
          if (!role) return false
          return (
            m.permissions.length === 0 ||
            m.permissions.includes(role)
          )
        })
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    }
  })
}