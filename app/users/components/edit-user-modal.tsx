// app/users/components/edit-user-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { KeyRound, Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ResCompany } from "@/app/types/odoo";
import type { POSConfig } from "@/app/types/pos";
import type { EnhancedUser } from "../users.client";
import type { UserRole } from "@/lib/constants";

interface EditUserModalProps {
  user: EnhancedUser;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  shops: POSConfig[];
  companies: ResCompany[];
}

interface UserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  shop_access_type: "all" | "specific";
  assigned_shops: string[];
  assigned_companies: number[];
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "user", label: "Utilisateur" },
  { value: "manager", label: "Manager" },
  { value: "financier", label: "Financier" },
  { value: "controller", label: "Contrôleur" },
  { value: "inventory-manager", label: "Gestionnaire Stock" },
  { value: "admin", label: "Administrateur" },
];

const ROLE_HINTS: Partial<Record<UserRole, string>> = {
  controller: "Accès limité aux notes de frais",
  financier: "Accès complet au module Finance",
  admin: "Accès total à l'application",
};

export function EditUserModal({
  user,
  isOpen,
  onClose,
  onUserUpdated,
  shops,
  companies,
}: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<UserFormData>({
    email: user.email,
    full_name: user.full_name || "",
    role: user.role,
    shop_access_type: user.shop_access_type,
    assigned_shops: user.assigned_shops || [],
    assigned_companies: user.assigned_companies || [],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name || "",
        role: user.role,
        shop_access_type: user.shop_access_type,
        assigned_shops: user.assigned_shops || [],
        assigned_companies: user.assigned_companies || [],
      });
      setErrors({});
    }
  }, [user]);

  const update = <K extends keyof UserFormData>(
    key: K,
    value: UserFormData[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.email) next.email = "L'email est requis";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      next.email = "Format d'email invalide";

    if (!formData.full_name) next.full_name = "Le nom complet est requis";

    if (
      formData.shop_access_type === "specific" &&
      formData.assigned_shops.length === 0
    ) {
      next.assigned_shops = "Sélectionnez au moins une boutique";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erreur de modification");
      }

      onUserUpdated();
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur inattendue",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (
      !confirm(
        "Envoyer un email de réinitialisation de mot de passe à cet utilisateur ?",
      )
    )
      return;

    setResetting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Échec de l'envoi");
      }
      alert("Email de réinitialisation envoyé.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setResetting(false);
    }
  };

  const toggleShop = (shopId: string) => {
    update(
      "assigned_shops",
      formData.assigned_shops.includes(shopId)
        ? formData.assigned_shops.filter((id) => id !== shopId)
        : [...formData.assigned_shops, shopId],
    );
  };

  const toggleCompany = (companyId: number) => {
    update(
      "assigned_companies",
      formData.assigned_companies.includes(companyId)
        ? formData.assigned_companies.filter((id) => id !== companyId)
        : [...formData.assigned_companies, companyId],
    );
  };

  const handleClose = (open: boolean) => {
    if (!open && !loading) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Save className="w-4 h-4 text-sky-600" />
            Modifier l&apos;utilisateur
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground/80 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">
              {user.email} · créé le{" "}
              {new Date(user.created_at).toLocaleDateString("fr-FR")}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* ─── Identité ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email" required error={errors.email}>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="h-8 text-[11.5px]"
                  disabled={loading}
                />
              </Field>
              <Field
                label="Nom complet"
                required
                error={errors.full_name}
              >
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    update("full_name", e.target.value)
                  }
                  className="h-8 text-[11.5px]"
                  disabled={loading}
                />
              </Field>
            </div>

            {/* ─── Rôle & accès ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Rôle"
                required
                hint={ROLE_HINTS[formData.role]}
              >
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    update("role", v as UserRole)
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 text-[11.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem
                        key={r.value}
                        value={r.value}
                        className="text-xs"
                      >
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Accès boutiques" required>
                <Select
                  value={formData.shop_access_type}
                  onValueChange={(v) =>
                    update(
                      "shop_access_type",
                      v as "all" | "specific",
                    )
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 text-[11.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific" className="text-xs">
                      Boutiques spécifiques
                    </SelectItem>
                    <SelectItem value="all" className="text-xs">
                      Toutes les boutiques
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* ─── Boutiques ────────────────────────────── */}
            {formData.shop_access_type === "specific" && (
              <Field
                label="Boutiques assignées"
                required
                error={errors.assigned_shops}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-2 border border-border/60 rounded-lg bg-muted/20">
                  {shops.map((shop) => {
                    const id = shop.id.toString();
                    const checked =
                      formData.assigned_shops.includes(id);
                    return (
                      <label
                        key={shop.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors text-[11px]",
                          checked
                            ? "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400"
                            : "hover:bg-accent/30",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            toggleShop(id)
                          }
                          disabled={loading}
                        />
                        <span className="truncate">
                          {shop.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* ─── Entreprises ──────────────────────────── */}
            <Field label="Entreprises assignées">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-2 border border-border/60 rounded-lg bg-muted/20">
                {companies.map((c) => {
                  const checked =
                    formData.assigned_companies.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors text-[11px]",
                        checked
                          ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400"
                          : "hover:bg-accent/30",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          toggleCompany(c.id)
                        }
                        disabled={loading}
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </Field>

            {/* ─── Zone dangereuse ──────────────────────── */}
            <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400">
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>Réinitialisation du mot de passe</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={resetting || loading}
                className="h-7 px-2.5 text-[11px] gap-1.5 border-amber-300/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/40"
              >
                {resetting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <KeyRound className="w-3 h-3" />
                )}
                Envoyer l&apos;email
              </Button>
            </div>

            {/* ─── Erreur globale ───────────────────────── */}
            {errors.submit && (
              <div className="rounded-md px-3 py-2 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                {errors.submit}
              </div>
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border/60 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleClose(false)}
              disabled={loading}
              className="h-8 text-[11px]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Field helper
// ─────────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </Label>
        {hint && (
          <span className="text-[10px] text-muted-foreground/60 italic truncate">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}