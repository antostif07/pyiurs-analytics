// app/hr/_components/hr-context.tsx
"use client";

import React, { createContext, useContext, useState } from "react";

interface HRContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const HRContext = createContext<HRContextType | undefined>(undefined);

export function HRProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <HRContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </HRContext.Provider>
  );
}

export const useHRUI = () => {
  const context = useContext(HRContext);
  if (!context) throw new Error("useHRUI must be used within HRProvider");
  return context;
};