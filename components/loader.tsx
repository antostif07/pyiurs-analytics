'use client';

import Image from "next/image";

export default function Loader({placeholder}: {placeholder?: string}) {
  return (
    <div className="w-full h-125 flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
      <div className="relative flex items-center justify-center">
        {/* Spinner Extérieur Indigo */}
        <div className="absolute w-24 h-24 border-4 border-pink-50 rounded-full" />
        <div className="absolute w-24 h-24 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
        
        {/* Ton Logo au centre avec pulsation */}
        <div className="relative w-16 h-16 animate-pulse">
          <Image 
            src="/logo.png" 
            alt="Loading..." 
            fill 
            className="object-contain"
          />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] animate-pulse">
          {placeholder || "Chargement..."}
        </p>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-pink-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-pink-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-pink-600 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}