// src/components/ThemeSwitcher.tsx
import { useTheme, type Theme } from '#/lib/contexts/theme-context';
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Clair' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'Système' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Sombre' },
  ]

  return (
    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-0.5 shadow-inner backdrop-blur-md">
      {options.map((opt) => {
        const isActive = theme === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            title={opt.label}
            type="button"
            className={`
              flex items-center justify-center p-2 rounded-lg transition-all duration-200 cursor-pointer
              ${isActive 
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200/30 dark:border-slate-700/20' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'
              }
            `}
          >
            {opt.icon}
          </button>
        )
      })}
    </div>
  )
}