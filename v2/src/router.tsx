// src/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen' // Arbre de routes auto-généré

// 1. Correction : On exporte "getRouter" au lieu de "createRouter" pour TanStack Start !
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes de cache
        refetchOnWindowFocus: false, // Pas de rafraîchissement au focus de la fenêtre
        retry: 1, // Réessayer 1 fois maximum en cas d'échec
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      auth: undefined,
    },
  })

  // 2. Correction : On passe un seul objet d'options à setupRouterSsrQueryIntegration !
  setupRouterSsrQueryIntegration({ 
    router, 
    queryClient 
  })

  return router
}

// 3. Enregistrement global des types avec le nom getRouter mis à jour
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}