// app/hr/_components/mobile-overlay.tsx
"use client";
import { useHRUI } from "./hr-context";

export function MobileOverlay() {
  const { isSidebarOpen, closeSidebar } = useHRUI();
  if (!isSidebarOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
      onClick={closeSidebar}
      aria-hidden="true"
    />
  );
}