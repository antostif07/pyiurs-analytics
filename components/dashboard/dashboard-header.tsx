import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

interface DashboardHeaderProps {
  user: any;
  profile: any;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
}

export const DashboardHeader = ({ user, profile, darkMode, onToggleDarkMode, onSignOut }: DashboardHeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pyiurs Dashboard</h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {profile?.role?.toUpperCase() || 'USER'}
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <button onClick={onToggleDarkMode} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-700 pl-4">
              <div className="flex flex-col text-right">
                <span className="text-sm font-medium text-slate-900 dark:text-white">{profile?.full_name || 'Utilisateur'}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <div className="h-9 w-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <button onClick={onSignOut} className="ml-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Se déconnecter">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <button onClick={onToggleDarkMode} className="p-2 text-slate-500">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};