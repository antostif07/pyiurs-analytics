import * as React from "react";
import { LogOut, Shield, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../../lib/contexts/auth-context";
import { useClickOutside } from "../../hooks/useClickOutside";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function UserDropdown() {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const dropdownRef = useClickOutside<HTMLDivElement>(
    React.useCallback(() => {
      setIsOpen(false);
      setIsConfirmOpen(false);
    }, [])
  );

  // Écoute de la touche Échap
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsConfirmOpen(false);
      }
    };

    if (isOpen || isConfirmOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConfirmOpen]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
    setIsConfirmOpen(false);
  }, []);

  const handleSignOutClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmOpen(true);
    setIsOpen(false);
  }, []);

  const handleConfirmSignOut = React.useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success("Déconnexion réussie. À bientôt !");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion. Veuillez réessayer.");
      console.error(error);
    } finally {
      setIsSigningOut(false);
      setIsConfirmOpen(false);
    }
  }, [signOut]);

  const userInitials = profile?.full_name
    ? `${profile.full_name.charAt(0)}${profile.full_name.split(' ').pop()?.charAt(0)}`.toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "US";

  const userFullName = profile?.full_name
    ? `${profile.full_name}`
    : user?.email?.split("@")[0] || "Collaborateur";

  return (
    <div className="relative flex items-center gap-3" ref={dropdownRef}>
      {/* Information textuelle masquée sur petit mobile */}
      <span className="text-xs text-muted-foreground hidden sm:block">
        Bienvenue, <span className="font-semibold text-foreground">{userFullName}</span>
      </span>

      {/* Bouton d'avatar */}
      <button
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Menu utilisateur de ${userFullName}. Initiales: ${userInitials}`}
        id="user-menu-button"
        className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold cursor-pointer select-none hover:bg-primary/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {userInitials}
      </button>

      {/* Menu déroulant classique */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="menu"
            aria-label="Actions utilisateur"
            className="absolute right-0 top-12 w-52 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 focus:outline-none"
          >
            <div className="px-3 py-2.5 border-b border-border/60 text-xs">
              <p className="font-bold text-foreground truncate">{userFullName}</p>
              <p className="text-muted-foreground truncate mt-0.5">{user?.email}</p>
            </div>

            <div className="px-3 py-2 border-b border-border/60 text-xs text-muted-foreground flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-900/30 my-1 rounded-md">
              <Shield className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="capitalize font-semibold">{profile?.role || "Collaborateur"}</span>
            </div>

            <button
              role="menuitem"
              onClick={handleSignOutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors font-medium outline-none focus-visible:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Déconnecter la session</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boîte de Dialogue Modale de Confirmation de Déconnexion */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay d'arrière-plan */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Carte Modale */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-modal-title"
              aria-describedby="confirm-modal-desc"
              className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center gap-3 mb-4 text-amber-500">
                <AlertCircle className="w-6 h-6 shrink-0" aria-hidden="true" />
                <h3 id="confirm-modal-title" className="text-base font-extrabold text-foreground">
                  Fermeture de session
                </h3>
              </div>

              <p id="confirm-modal-desc" className="text-xs text-muted-foreground leading-relaxed mb-6">
                Êtes-vous sûr de vouloir vous déconnecter de votre espace de travail Pyiurs Analytics ? Vos modifications non sauvegardées seront perdues.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleConfirmSignOut}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-75 shadow-md shadow-red-500/10"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Fermeture...</span>
                    </>
                  ) : (
                    <span>Confirmer</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}