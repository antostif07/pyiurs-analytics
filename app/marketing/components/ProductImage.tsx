'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff, X, ZoomIn } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
}

export default function ProductImage({ src, alt }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (hasError || !src) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 cursor-not-allowed">
        <ImageOff size={16} />
      </div>
    );
  }

  const modal = isOpen && mounted ? createPortal(
    <div
      // ✅ z-index inline (infaillible), pas dépendant de Tailwind
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647, // max int32, garanti au-dessus de tout
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${alt}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20"
        style={{ zIndex: 2147483647 }}
        aria-label="Fermer"
      >
        <X size={24} />
      </button>

      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        className="shadow-2xl rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  ) : null;

  return (
    <>
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="text-white drop-shadow-md" size={16} />
        </div>
      </div>
      {modal}
    </>
  );
}