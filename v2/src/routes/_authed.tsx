import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'

export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }
  })

export const Route = createFileRoute('/_authed')({
  // Intercepte et redirige instantanément l'utilisateur avant le moindre rendu
  beforeLoad: ({ context, location }) => {
    if (!context.auth?.user) {
      throw redirect({
        to: '/login',
        search: {
          // Permet de mémoriser la page d'origine pour y retourner après connexion
          redirect: location.href,
        },
      })
    }
  },
})