// app/rapport-journalier/RapportHeader.tsx
'use client';

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, History, Menu, X, File, Home, ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POSConfig } from "@/app/types/pos";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface RapportHeaderProps {
    selectedDate: Date;
    handleDateChange: (date: Date) => void;
}

export default function RapportHeader({
    selectedDate, 
    handleDateChange, 
}: RapportHeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="border-b border-gray-200 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md sticky top-0 z-30 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 py-3">
                {/* Header principal */}
                <div className="flex items-center justify-between">
                    {/* Partie gauche - Logo, bouton home et titre */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Bouton Retour Accueil */}
                        <Link href="/" className="group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-lg transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-105 group-hover:shadow-md"
                            >
                                <Home className="h-5 w-5 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110" />
                            </Button>
                        </Link>

                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl shadow-lg">
                                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                                    Rapport Journalier
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: fr }) : "Date non sélectionnée"}
                                    </Badge>
                                    <p className="text-gray-500 text-xs hidden sm:block">
                                        Synthèse des activités quotidiennes
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Partie droite - Desktop & Tablette */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Bouton Historique (optionnel) */}
                        <Link href="/historique">
                            <Button variant="outline" size="sm" className="gap-2 transition-all hover:shadow-md">
                                <History className="w-4 h-4" />
                                Historique
                            </Button>
                        </Link>

                        {/* Sélecteur de date */}
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2 border">
                            <CalendarIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                Date :
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"ghost"}
                                        className={cn(
                                            "w-[200px] justify-start text-left font-normal p-0 h-auto hover:bg-transparent",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        {selectedDate ? (
                                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                                {format(selectedDate, "PPP", { locale: fr })}
                                            </span>
                                        ) : (
                                            <span>Choisissez une date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => date && handleDateChange(date)}
                                        initialFocus
                                        className="rounded-md border shadow-lg"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Indicateur de statut */}
                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200">
                            ✓ Actif
                        </Badge>
                    </div>

                    {/* Menu mobile */}
                    <div className="flex md:hidden items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                            ✓
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="h-10 w-10 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Menu mobile déroulant */}
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in-80">
                        {/* Sélecteur de date mobile */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <CalendarIcon className="w-4 h-4" />
                                Date du rapport
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-12",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-3 h-4 w-4" />
                                        {selectedDate ? (
                                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                                {format(selectedDate, "PPP", { locale: fr })}
                                            </span>
                                        ) : (
                                            <span>Choisissez une date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            if (date) handleDateChange(date);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Actions mobiles */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Link href="/" className="w-full">
                                <Button 
                                    variant="outline" 
                                    className="w-full gap-2 h-12 justify-start"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Home className="w-4 h-4" />
                                    Accueil
                                </Button>
                            </Link>
                            <Link href="/historique" className="w-full">
                                <Button 
                                    variant="outline" 
                                    className="w-full gap-2 h-12 justify-start"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <History className="w-4 h-4" />
                                    Historique
                                </Button>
                            </Link>
                        </div>

                        {/* Statut mobile */}
                        <div className="flex items-center justify-center pt-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                ✓ Rapport chargé avec succès
                            </Badge>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}