import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  rightTop?: ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  rightTop,
}: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="
        relative
        w-full
        rounded-3xl
        border
        border-border/60
        bg-card/60
        backdrop-blur-2xl
        shadow-xl
        p-8
        sm:p-10
      "
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Top right slot (theme toggle etc.) */}
      {rightTop && (
        <div className="absolute right-5 top-5">
          {rightTop}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-5">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-8 border-t border-border/60 pt-6">
          {footer}
        </div>
      )}
    </motion.div>
  );
}