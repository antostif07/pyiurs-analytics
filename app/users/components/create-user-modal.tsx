// app/users/components/create-user-modal.tsx
"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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
import type { UserRole } from "@/lib/constants";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
  shops: POSConfig[];
  companies: ResCompany[];
}

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  shop_access_type: "all" | "specific";
  assigned_shops: string[];
  assigned_companies: number[];
  send_invitation: boolean;
}

const INITIAL_FORM: UserFormData = {
  email: "",
  password: "",
  full_name: "",
  role: "user",
  shop_access_type: "specific",
  assigned_shops: [],
  assigned_companies: [],
  send_invitation: true,
};

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

export function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
  shops,
  companies,
}: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (!formData.send_invitation) {
      if (!formData.password) next.password = "Mot de passe requis";
      else if (formData.password.length < 6)
        next.password = "Minimum 6 caractères";
    }

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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erreur de création");
      }

      setFormData(INITIAL_FORM);
      setErrors({});
      onUserCreated();
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur inattendue",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && !loading) {
      setFormData(INITIAL_FORM);
      setErrors({});
      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-sky-600" />
            Créer un utilisateur
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground/80">
            Compte, rôle et affectations boutiques / sociétés
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
                  placeholder="email@exemple.com"
                  className="h-8 text-[11.5px]"
                  disabled={loading}
                />
              </Field>

              <Field label="Nom complet" required error={errors.full_name}>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="John Doe"
                  className="h-8 text-[11.5px]"
                  disabled={loading}
                />
              </Field>
            </div>

            {/* ─── Invitation / Mot de passe ─────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <Field
                label={`Mot de passe${!formData.send_invitation ? " *" : ""}`}
                error={errors.password}
              >
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => update("password", e.target.value)}
                  disabled={formData.send_invitation || loading}
                  placeholder="••••••••"
                  className="h-8 text-[11.5px]"
                />
              </Field>

              <div className="flex items-center gap-2 h-8">
                <Checkbox
                  id="send_invitation"
                  checked={formData.send_invitation}
                  onCheckedChange={(v) => {
                    update("send_invitation", !!v);
                    if (v) update("password", "");
                  }}
                  disabled={loading}
                />
                <label
                  htmlFor="send_invitation"
                  className="text-[11px] text-muted-foreground cursor-pointer select-none"
                >
                  Envoyer un email d&apos;invitation
                </label>
              </div>
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
                <UserPlus className="w-3 h-3" />
              )}
              {loading ? "Création..." : "Créer l'utilisateur"}
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