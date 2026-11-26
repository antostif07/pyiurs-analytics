"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    UploadCloud,
    Image as ImageIcon,
    CheckCircle2,
    Loader2,
    RefreshCw,
    FileImage,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Trash2,
    Copy,
    ExternalLink,
    Eye,
    Check
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import ProductImage from "@/app/marketing/components/ProductImage";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Gallery States
    const [isLoadingGallery, setIsLoadingGallery] = useState(true);
    const [gallery, setGallery] = useState<FtpImage[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal / Lightbox States
    const [selectedImage, setSelectedImage] = useState<FtpImage | null>(null);
    const [imageToDelete, setImageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchGallery();
        return () => previews.forEach(url => URL.revokeObjectURL(url));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchGallery = async () => {
        setIsLoadingGallery(true);
        try {
            const res = await fetch("/api/ftp/images");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (data.images) {
                setGallery(data.images);
                setCurrentPage(1);
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
            toast.error("Vous ne pouvez pas dépasser 10 images à la fois.");
            return;
        }

        const newFiles = [...files, ...imageFiles];
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

    // --- SUPPRESSION IMAGE FTP ---
    const handleDeleteImage = async () => {
        if (!imageToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/ftp/images?name=${encodeURIComponent(imageToDelete)}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Image supprimée avec succès");
            setImageToDelete(null);
            setSelectedImage(null);
            fetchGallery();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la suppression");
        } finally {
            setIsDeleting(false);
        }
    };

    // --- COPIER LIEN ---
    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Lien copié dans le presse-papier !");
        setTimeout(() => setCopied(false), 2000);
    };

    // --- FILTRAGE & PAGINATION ---
    const filteredGallery = useMemo(() => {
        if (!searchQuery.trim()) return gallery;
        return gallery.filter(img => img.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    }, [gallery, searchQuery]);

    const totalPages = Math.ceil(filteredGallery.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentImages = filteredGallery.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Gestion des Médias</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Ajoutez les photos (Max 10). Elles gardent leur nom d'origine et écrasent les anciennes si elles existent.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. ZONE DRAG & DROP (Gauche) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
                        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <UploadCloud className="w-4 h-4 text-indigo-600" />
                            Upload Multiple
                        </h2>

                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                                }`}
                        >
                            <input
                                type="file" multiple accept="image/*" className="hidden" ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                                }}
                            />
                            <FileImage className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-700">Cliquez ou glissez vos images ici</p>
                            <p className="text-[11px] text-slate-500 mt-1">Jusqu&apos;à 10 fichiers (.jpg, .png, .webp)</p>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-5 space-y-3">
                                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                                    <span>Sélectionnés ({files.length}/10)</span>
                                    <button onClick={() => { setFiles([]); setPreviews([]); }} className="text-red-500 hover:underline text-[11px]">Tout effacer</button>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                                    {previews.map((url, i) => (
                                        <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                                            <Image src={url} alt="preview" fill className="object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-xs"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                                <p className="text-[9px] text-white truncate text-center">{files[i].name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleUpload} disabled={isUploading}
                                    className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                    {isUploading ? "Envoi en cours..." : "Envoyer sur le serveur"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. GALERIE FTP PAGINÉE & RECHERCHE (Droite) */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 h-full flex flex-col">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 shrink-0">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                Galerie FTP ({filteredGallery.length})
                            </h2>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {/* Barre de recherche */}
                                <div className="relative flex-1 sm:w-56">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        placeholder="Filtrer par nom..."
                                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs bg-slate-50/50 focus:bg-white transition-colors outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                <button onClick={fetchGallery} className="text-slate-500 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200 shrink-0" title="Rafraîchir">
                                    <RefreshCw className={`w-4 h-4 ${isLoadingGallery ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>

                        {isLoadingGallery ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 flex-1">
                                <Loader2 className="w-7 h-7 animate-spin mb-3 text-indigo-500" />
                                <p className="text-xs">Chargement des médias FTP...</p>
                            </div>
                        ) : filteredGallery.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl flex-1 flex flex-col items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-500">Aucune image trouvée.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-1 pb-2 flex-1 content-start min-h-[380px]">
                                    {currentImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedImage(img)}
                                            className="group relative border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-400 transition-all cursor-pointer shadow-2xs hover:shadow-md bg-slate-50 flex flex-col h-fit"
                                        >
                                            <div className="aspect-square relative w-full bg-slate-100">
                                                <Image src={img.url} alt={img.name} fill className="object-cover group-hover:scale-105 transition-transform duration-200" unoptimized />
                                            </div>
                                            <div className="p-2.5 bg-white flex flex-col justify-between flex-1">
                                                <p className="text-[11px] font-bold text-slate-800 truncate" title={img.name}>{img.name}</p>
                                                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                                                    <span>{img.size}</span>
                                                    <Eye className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* PAGINATION */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 shrink-0 text-xs">
                                        <span className="text-slate-500 font-medium">
                                            Page <span className="text-slate-900 font-bold">{currentPage}</span> / {totalPages}
                                        </span>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setCurrentPage(p => p - 1)}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                                <span>Précédent</span>
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <span>Suivant</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </div>

            {/* --- MODAL LIGHTBOX / ZOOM & ACTIONS --- */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-2xl p-4 sm:p-6 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold truncate pr-6">{selectedImage?.name}</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Taille : {selectedImage?.size} · Modifié le : {selectedImage?.date}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedImage && (
                        <div className="space-y-4">
                            <div className="relative w-full h-72 sm:h-96 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                                <Image
                                    src={selectedImage.url}
                                    alt={selectedImage.name}
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(selectedImage.url)}
                                        className="h-8 text-xs gap-1.5"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? "Copié !" : "Copier le lien"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-8 text-xs gap-1.5"
                                    >
                                        <a href={selectedImage.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Ouvrir original
                                        </a>
                                    </Button>
                                </div>

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setImageToDelete(selectedImage.name)}
                                    className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Supprimer du FTP
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* --- MODAL CONFIRMATION SUPPRESSION --- */}
            <Dialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold">Confirmer la suppression</DialogTitle>
                        <DialogDescription className="text-xs">
                            Voulez-vous vraiment supprimer définitivement <strong className="text-slate-900">{imageToDelete}</strong> du serveur FTP ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => setImageToDelete(null)}
                            className="text-xs h-8"
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            onClick={handleDeleteImage}
                            className="text-xs h-8 bg-red-600 hover:bg-red-700 gap-1.5"
                        >
                            {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}