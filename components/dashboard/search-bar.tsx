// app/components/SearchBar.tsx
'use client'

interface SearchBarProps {
  search: string
  setSearch: (search: string) => void
}

export default function SearchBar({ search, setSearch }: SearchBarProps) {
  return (
    <input
      type="text"
      placeholder="🔍 Rechercher un module..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="mb-10 w-full max-w-md block px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
    />
  )
}