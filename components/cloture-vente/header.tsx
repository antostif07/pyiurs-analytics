import { format } from "date-fns";
import { Calculator, Calendar, History, Menu, X } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { POSConfig } from "@/app/types/pos";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { useState } from "react";

interface ClotureVenteHeaderProps {
    selectedShop: string;
    selectedDate: Date;
    handleShopChange: (value: string) => void;
    handleDateChange: (date: Date) => void;
    exchangeRate: number;
    shops: POSConfig[];
}

export default function ClotureVenteHeader({
    selectedShop, 
    selectedDate, 
    handleShopChange, 
    handleDateChange, 
    exchangeRate, 
    shops
}: ClotureVenteHeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
                {/* Header principal */}
                <div className="flex items-center justify-between">
                    {/* Partie gauche - Logo et titre */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <Link 
                            href="/"
                            className="inline-flex items-center px-3 py-1 sm:px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-sm sm:text-base"
                        >
                            ← Retour
                        </Link>

                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                            <div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                    Clôture des Ventes
                                </h1>
                                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                                    {format(selectedDate, 'dd/MM/yyyy')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Partie droite - Desktop */}
                    <div className="hidden lg:flex items-center gap-4">
                        {/* Filtres */}
                        <div className="flex items-center gap-3">
                            {/* Sélecteur de Date */}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-600">Date:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[140px] justify-start text-left font-normal",
                                                !selectedDate && "text-muted-foreground"
                                            )}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Choisir date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => date && handleDateChange(date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Filtre Shop */}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-600">Shop:</span>
                                <Select
                                    value={selectedShop}
                                    onValueChange={handleShopChange}
                                >
                                    <SelectTrigger className="w-32 bg-white border-gray-300 text-gray-900">
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous</SelectItem>
                                        {
                                            shops.map((shop) => (
                                                <SelectItem key={shop.id} value={shop.id.toString()}>
                                                    {shop.name}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Taux du jour */}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-600">Taux:</span>
                                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                                    {exchangeRate?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FC/$
                                </div>
                            </div>
                        </div>

                        {/* Lien vers l'historique */}
                        <Link href="/cloture-vente/historique">
                            <Button 
                                variant="outline" 
                                className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                            >
                                <History className="w-4 h-4" />
                                Historique
                            </Button>
                        </Link>
                    </div>

                    {/* Version tablette (md) */}
                    <div className="hidden md:flex lg:hidden items-center gap-3">
                        {/* Filtres compacts pour tablette */}
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        size="sm"
                                        className={cn(
                                            "w-[100px] justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <Calendar className="mr-1 h-3 w-3" />
                                        {selectedDate ? format(selectedDate, "dd/MM") : "Date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => date && handleDateChange(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <Select
                                value={selectedShop}
                                onValueChange={handleShopChange}
                            >
                                <SelectTrigger className="w-24 bg-white border-gray-300 text-gray-900 text-sm">
                                    <SelectValue placeholder="Shop" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    {
                                        shops.map((shop) => (
                                            <SelectItem key={shop.id} value={shop.id.toString()}>
                                                {shop.name}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>

                            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                                {exchangeRate?.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} FC/$
                            </div>
                        </div>

                        <Link href="/cloture-vente/historique">
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="flex items-center gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                            >
                                <History className="w-3 h-3" />
                                Hist.
                            </Button>
                        </Link>
                    </div>

                    {/* Menu mobile */}
                    <div className="flex md:hidden">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Menu mobile déroulant */}
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 border-t pt-4 space-y-4">
                        {/* Filtres mobiles */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* Sélecteur de Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !selectedDate && "text-muted-foreground"
                                            )}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Choisir date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => {
                                                date && handleDateChange(date);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Filtre Shop */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">Shop</label>
                                <Select
                                    value={selectedShop}
                                    onValueChange={(value) => {
                                        handleShopChange(value);
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900">
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous</SelectItem>
                                        {
                                            shops.map((shop) => (
                                                <SelectItem key={shop.id} value={shop.id.toString()}>
                                                    {shop.name}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Taux et historique mobile */}
                            <div className="flex items-center justify-between pt-2">
                                {/* Taux du jour */}
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-600">Taux:</span>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                                        {exchangeRate?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FC/$
                                    </div>
                                </div>

                                {/* Lien vers l'historique */}
                                <Link href="/cloture-vente/historique" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button 
                                        variant="outline" 
                                        className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                                    >
                                        <History className="w-4 h-4" />
                                        Historique
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}