"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push('/')}
      className="p-2 mr-3 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
      aria-label="Retour"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}