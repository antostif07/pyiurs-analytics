"use client";
import { motion } from "framer-motion";
import { ShieldCheck, Clock } from "lucide-react";
import { AUDIT_LOGS } from "../_lib/mock-data";
import { Badge } from "@/components/ui/badge";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

export default function AuditLog() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
          <p className="text-xs text-muted-foreground">Recent stock changes by users</p>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {AUDIT_LOGS.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 px-5 py-3 hover:bg-accent/20 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
              {log.user.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-foreground">{log.user}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${
                    log.role === "Admin"
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {log.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {log.action}{" "}
                <span className="text-foreground/60">· {log.shop}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <Clock className="w-3 h-3" />
              {timeAgo(log.timestamp)}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
