import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login/')({
  component: LoginComponent,
})

function LoginComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <h1 className="text-xl">Page de Connexion (En développement)</h1>
    </div>
  )
}