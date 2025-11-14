// app/components/Footer.tsx
'use client'

export default function Footer() {
  return (
    <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-800">
      <p>Conçu avec ❤️ par <span className="text-blue-500 font-medium">Ushindi</span></p>
      <p className="mt-1">© {new Date().getFullYear()} Tous droits réservés</p>
    </footer>
  )
}