'use client'

import { useState } from 'react';
import { ImageOff, X, ZoomIn } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
}

export default function ProductImage({ src, alt }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Cas d'erreur : on affiche l'icône grise
  if (hasError || !src) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 cursor-not-allowed">
        <ImageOff size={16} />
      </div>
    );
  }

  return (
    <>
      {/* 1. MINIATURE (CLIQUABLE) */}
      <div 
        className="relative w-full h-full group cursor-zoom-in"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={() => setHasError(true)}
        />
        
        {/* Petit overlay au survol pour indiquer le zoom */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="text-white drop-shadow-md" size={16} />
        </div>
      </div>

      {/* 2. MODAL PLEIN ÉCRAN (ZOOM) */}
      {isOpen && (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)} // Fermer si on clique sur le fond
        >
            {/* Bouton Fermer */}
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20"
            >
                <X size={24} />
            </button>

            {/* Grande Image */}
            <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                onClick={(e) => e.stopPropagation()} // Empêche la fermeture si on clique sur l'image elle-même
            />
        </div>
      )}
    </>
  );
}