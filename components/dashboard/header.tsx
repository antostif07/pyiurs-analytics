import { useAuth } from "@/hooks/useAuth"
import { LogOut, Moon, Sun } from "lucide-react"

interface HeaderProps {
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void
}

export default function Header({ darkMode, setDarkMode }: HeaderProps) {
    const { user, logout } = useAuth()
    const handleLogout = async () => {
        await logout()
        window.location.reload()
    }
    
    return (
        <header className="flex justify-between items-center px-6 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Pyiurs Analytics
        </h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Bonjour, <strong>{user?.name}</strong>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>
    )
}