"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Image as ImageIcon, CheckCircle2, Loader2, RefreshCw, FileImage, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
// ✅ Assure-toi que ce chemin est correct
import ProductImage from "@/app/marketing/components/ProductImage";

interface FtpImage {
  name: string;
  url: string;
  size: string;
  date: string;
}

export default function MediaManagerPage() {
  // Upload States
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const[isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Gallery States
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [gallery, setGallery] = useState<FtpImage[]>([]);

  // ✅ NOUVEAU: États pour la Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 12 images par page (multiple de 2, 3, 4 pour la grille)

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGallery();
    // Nettoyage de la mémoire pour les URLs de prévisualisation
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGallery = async () => {
    setIsLoadingGallery(true);
    try {
      const res = await fetch("/api/ftp/images");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.images) {
        setGallery(data.images);
        setCurrentPage(1); // Retour à la page 1 lors du rafraîchissement
      }
    } catch (error: any) {
      toast.error(error.message || "Impossible de charger la galerie.");
    } finally {
      setIsLoadingGallery(false);
    }
  };

  // --- LOGIQUE DRAG & DROP ---
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter(f => f.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      toast.error("Veuillez sélectionner des images valides.");
      return;
    }

    if (files.length + imageFiles.length > 10) {
      toast.error("Vous ne pouvez pas dépasser 10 images.");
      return;
    }

    const newFiles =[...files, ...imageFiles];
    setFiles(newFiles);

    const newPreviews = imageFiles.map(f => URL.createObjectURL(f));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (indexToRemove: number) => {
    URL.revokeObjectURL(previews[indexToRemove]);
    setFiles(files.filter((_, i) => i !== indexToRemove));
    setPreviews(previews.filter((_, i) => i !== indexToRemove));
  };

  // --- UPLOAD ---
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
      const res = await fetch("/api/ftp/images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      
      previews.forEach(url => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      fetchGallery();

    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  // --- CALCULS DE PAGINATION ---
  const totalPages = Math.ceil(gallery.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentImages = gallery.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestion des Médias</h1>
        <p className="text-slate-500 mt-1">Ajoutez les photos (Max 10). Elles garderont leur nom d'origine et écraseront les anciennes si elles existent.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. ZONE DRAG & DROP (Gauche) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              Upload Multiple
            </h2>

            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
              }`}
            >
              <input 
                type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} 
                onChange={(e) => {
                  if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                }}
              />
              <FileImage className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Cliquez ou glissez vos images ici</p>
              <p className="text-xs text-slate-500 mt-1">Jusqu'à 10 fichiers (.jpg, .png)</p>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                  <span>Fichiers sélectionnés ({files.length}/10)</span>
                  <button onClick={() => { setFiles([]); setPreviews([]); }} className="text-red-500 hover:underline text-xs">Tout effacer</button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {previews.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                      <Image src={url} alt="preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                        <p className="text-[10px] text-white truncate text-center">{files[i].name}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleUpload} disabled={isUploading}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                  {isUploading ? "Envoi en cours..." : "Envoyer les images"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. GALERIE FTP PAGINÉE (Droite) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                Images sur le serveur FTP
              </h2>
              <button onClick={fetchGallery} className="text-slate-500 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-50 transition-colors" title="Rafraîchir">
                <RefreshCw className={`w-5 h-5 ${isLoadingGallery ? "animate-spin" : ""}`} />
              </button>
            </div>

            {isLoadingGallery ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 flex-1">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>Connexion au FTP en cours...</p>
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl flex-1">
                <p className="text-slate-500">Aucune image sur le serveur FTP.</p>
              </div>
            ) : (
              <>
                {/* LA GRILLE (Seulement 12 images max) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4 flex-1 content-start min-h-[400px]">
                  {currentImages.map((img, idx) => (
                    <div key={idx} className="group relative border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-colors h-fit">
                      <div className="aspect-square bg-slate-50 relative">
                        <Image src={img.url} alt={img.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="p-3 bg-white">
                        <p className="text-xs font-bold text-slate-800 truncate" title={img.name}>{img.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-500">{img.size}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                      {/* Tooltip ProductImage au survol */}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ProductImage src={img.url} alt={img.name} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ✅ LA PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 shrink-0">
                    <span className="text-sm text-slate-500 font-medium">
                      Page <span className="text-slate-900">{currentPage}</span> sur {totalPages} 
                      <span className="hidden sm:inline"> ({gallery.length} images)</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Précédent</span>
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="hidden sm:inline">Suivant</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}