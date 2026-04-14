"use client";
import { useState } from "react";
import { toast } from "sonner";
import { NAV_GROUPS } from "@/app/inventory/config";
import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import { usePathname } from "next/navigation";

export default function ComingSoonPage() {
    const pathname = usePathname();
    const allItems = NAV_GROUPS.flatMap((g) => g.items);
    const match = allItems.find((i) => i.path === pathname);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center max-w-sm"
      >
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
          {match ? (
            <match.icon className="w-6 h-6 text-primary" />
          ) : (
            <Construction className="w-6 h-6 text-primary" />
          )}
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {match?.label ?? "Page"} Coming Soon
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This section is part of the full enterprise module and will be
          available in a future milestone. The navigation is fully wired and
          ready.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-accent rounded-xl px-4 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">In development</span>
        </div>
      </motion.div>
    </div>
  );
}