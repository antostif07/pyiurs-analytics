// src/routes/__root.tsx
/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext, // On passe à createRootRouteWithContext pour le typage de QueryClient
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { NotFound } from '../components/NotFound'
import appCss from '../styles.css?url'
import { seo } from '../utils/seo'
import { AuthProvider } from '../../lib/contexts/auth-context'
import { Toaster } from "@/components/ui/sonner"

import type { User } from '@supabase/supabase-js'
import type { Profile } from '../../lib/supabase/types'
import { ThemeProvider } from '#/lib/contexts/theme-context'

// 1. Fonction serveur de récupération utilisateur + profil
const fetchServerAuth = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { getServerAuth } = await import('../../lib/supabase/server')
    const { user, profile } = await getServerAuth()
    return { user, profile }
  } catch (error) {
    return { user: null, profile: null }
  }
})

// 2. Définition du contexte global incluant l'état d'auth typé (zéro any)
interface MyRouterContext {
  queryClient: QueryClient
  auth?: {
    user: User | null
    profile: Partial<Profile> | null
  }
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // 3. beforeLoad s'exécute AVANT le chargement des routes filles et injecte l'auth dans le contexte
  beforeLoad: async () => {
    const authData = await fetchServerAuth()
    return {
      auth: authData,
    }
  },
  // 4. Le loader récupère simplement l'auth déjà présente dans le contexte pour l'envoyer au RootComponent
  loader: async ({ context }) => {
    return context.auth
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
      ...seo({
        title: 'Pyiurs Analytics | Gestion d\'entreprise & Analytics',
        description: 'Plateforme d\'analyse de données et de gestion business intelligente connectée à Odoo et Supabase.',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/site.webmanifest', color: '#ffffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: () => {
    return (
      <RootDocument>
        <div>error</div>
      </RootDocument>
    )
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function TopProgressLoader() {
  const isNavigating = useRouterState({
    select: (s) => s.status === 'pending'
  })

  if (!isNavigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] bg-[#fd6c9e] z-[9999] animate-pulse origin-left transition-all duration-300" />
  )
}

function RootComponent() {
  const { user, profile } = Route.useLoaderData()
  const { queryClient } = Route.useRouteContext()

  return (
    <RootDocument>
      <TopProgressLoader />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider serverUser={user} serverProfile={profile}>
            <Outlet />
          <TanStackRouterDevtools position="bottom-right" />
        </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <Toaster richColors position="top-right" />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
       <body className="antialiased font-sans bg-background text-foreground" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  )
}