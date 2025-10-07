"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Filter, X, ChevronDown, Calendar } from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface CompactFiltersProps {
  brands: string[];
  colors: string[];
  selectedBrand?: string;
  selectedColor?: string;
  selectedStock?: string;
  startDate?: string;
  endDate?: string;
  stockLevels: {
    outOfStock: number;
    critical: number;
    low: number;
    good: number;
  };
}

export function CompactFilters({ 
  brands, 
  colors, 
  selectedBrand, 
  selectedColor, 
  selectedStock,
  startDate,
  endDate,
  stockLevels 
}: CompactFiltersProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<DateRange | undefined>(undefined);

  // Initialiser les dates à partir de l'URL ou utiliser le mois actuel
  const getInitialDateRange = (): DateRange => {
    if (startDate && endDate) {
      return {
        from: new Date(startDate),
        to: new Date(endDate),
      }
    }
    const today = new Date();
    return {
      from: startOfMonth(today),
      to: endOfMonth(today),
    }
  };

  const [date, setDate] = useState<DateRange | undefined>(getInitialDateRange);

  // Synchroniser l'état local avec les props (URL)
  useEffect(() => {
    setDate(getInitialDateRange());
  }, [startDate, endDate, getInitialDateRange]);

  // Initialiser tempDate quand le popover s'ouvre
  useEffect(() => {
    if (isDatePickerOpen) {
      setTempDate(date);
    }
  }, [isDatePickerOpen, date]);

  const updateFilter = (type: 'brand' | 'color' | 'stock', value: string) => {
    const url = new URL(window.location.href);
    
    if (value === 'all') {
      url.searchParams.delete(type);
    } else {
      url.searchParams.set(type, value);
    }
    
    window.location.href = url.toString();
  };

  const applyDateFilter = () => {
    if (tempDate?.from && tempDate?.to) {
      const url = new URL(window.location.href);
      url.searchParams.set('start_date', format(tempDate.from, 'yyyy-MM-dd'));
      url.searchParams.set('end_date', format(tempDate.to, 'yyyy-MM-dd'));
      window.location.href = url.toString();
    }
    setIsDatePickerOpen(false);
  };

  const resetToCurrentMonth = () => {
    const today = new Date();
    const newRange = {
      from: startOfMonth(today),
      to: endOfMonth(today),
    };
    
    const url = new URL(window.location.href);
    url.searchParams.set('start_date', format(newRange.from, 'yyyy-MM-dd'));
    url.searchParams.set('end_date', format(newRange.to, 'yyyy-MM-dd'));
    window.location.href = url.toString();
    setIsDatePickerOpen(false);
  };

  const clearDateFilter = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('start_date');
    url.searchParams.delete('end_date');
    window.location.href = url.toString();
    setIsDatePickerOpen(false);
  };

  const clearFilter = (type: 'brand' | 'color' | 'stock') => {
    const url = new URL(window.location.href);
    url.searchParams.delete(type);
    window.location.href = url.toString();
  };

  const clearAllFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('brand');
    url.searchParams.delete('color');
    url.searchParams.delete('stock');
    url.searchParams.delete('start_date');
    url.searchParams.delete('end_date');
    window.location.href = url.toString();
  };

  const hasActiveFilters = selectedBrand || selectedColor || selectedStock || (startDate && endDate);

  const getStockLabel = (stock: string) => {
    const labels: { [key: string]: string } = {
      'out_of_stock': `Rupture (${stockLevels.outOfStock})`,
      'critical': `Critique (${stockLevels.critical})`,
      'low': `Faible (${stockLevels.low})`,
      'good': `Bon (${stockLevels.good})`,
      'over_5': '> 5',
      'over_10': '> 10',
      'over_20': '> 20'
    };
    return labels[stock] || stock;
  };

  const getDateRangeLabel = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Vérifier si c'est le mois actuel
      const today = new Date();
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);
      
      if (
        format(start, 'yyyy-MM-dd') === format(currentMonthStart, 'yyyy-MM-dd') &&
        format(end, 'yyyy-MM-dd') === format(currentMonthEnd, 'yyyy-MM-dd')
      ) {
        return "Mois actuel";
      }
      
      return `${format(start, 'dd/MM/yy')} - ${format(end, 'dd/MM/yy')}`;
    }
    return "Mois actuel";
  };

  const isCurrentMonth = () => {
    if (!startDate || !endDate) return true;
    
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    
    return (
      format(new Date(startDate), 'yyyy-MM-dd') === format(currentMonthStart, 'yyyy-MM-dd') &&
      format(new Date(endDate), 'yyyy-MM-dd') === format(currentMonthEnd, 'yyyy-MM-dd')
    );
  };

  const handleTempDateSelect = (range: DateRange | undefined) => {
    setTempDate(range);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      {/* En-tête avec badges des filtres actifs */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          
          {/* Badges des filtres actifs */}
          <div className="flex items-center gap-2">
            {selectedBrand && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Marque: {selectedBrand}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearFilter('brand')}
                />
              </Badge>
            )}
            {selectedColor && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Gamme: {selectedColor}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearFilter('color')}
                />
              </Badge>
            )}
            {selectedStock && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Stock: {getStockLabel(selectedStock)}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearFilter('stock')}
                />
              </Badge>
            )}
            {(startDate && endDate && !isCurrentMonth()) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Période: {getDateRangeLabel()}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={clearDateFilter}
                />
              </Badge>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Tout effacer
            </Button>
          )}
        </div>

        {/* Bouton pour ouvrir le panneau de filtres avancés */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ChevronDown className="h-4 w-4" />
              Filtres avancés
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filtres avancés</SheetTitle>
            </SheetHeader>
            
            <ScrollArea className="h-full py-6">
              <div className="space-y-6 px-4">
                {/* Filtre par date */}
                <div>
                  <h4 className="font-medium mb-3">Période</h4>
                  <div className="space-y-3">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}
                              </>
                            ) : (
                              format(date.from, "dd/MM/yy")
                            )
                          ) : (
                            <span>Choisir une période</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          defaultMonth={tempDate?.from || date?.from}
                          selected={tempDate}
                          onSelect={handleTempDateSelect}
                          numberOfMonths={1}
                          className="p-3"
                        />
                        <div className="p-3 border-t space-y-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={applyDateFilter}
                              disabled={!tempDate?.from || !tempDate?.to}
                            >
                              Appliquer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setIsDatePickerOpen(false)}
                            >
                              Annuler
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={resetToCurrentMonth}
                          >
                            Mois actuel
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={resetToCurrentMonth}
                      >
                        Mois actuel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={clearDateFilter}
                      >
                        Effacer
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sélectionnez la période et cliquez sur Appliquer
                  </p>
                </div>

                {/* Filtre Marque */}
                <div>
                  <h4 className="font-medium mb-3">Marques</h4>
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-2 space-y-1">
                      <Button
                        variant={!selectedBrand ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => updateFilter('brand', 'all')}
                      >
                        Toutes les marques
                      </Button>
                      {brands.map((brand) => (
                        <Button
                          key={brand}
                          variant={selectedBrand === brand ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => updateFilter('brand', brand)}
                        >
                          {brand}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Filtre Gamme */}
                <div>
                  <h4 className="font-medium mb-3">Gammes</h4>
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-2 space-y-1">
                      <Button
                        variant={!selectedColor ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => updateFilter('color', 'all')}
                      >
                        Toutes les gammes
                      </Button>
                      {colors.map((color) => (
                        <Button
                          key={color}
                          variant={selectedColor === color ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => updateFilter('color', color)}
                        >
                          {color}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Filtre Stock */}
                <div>
                  <h4 className="font-medium mb-3">Niveau de stock</h4>
                  <div className="space-y-1">
                    <Button
                      variant={!selectedStock ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'all')}
                    >
                      Tous les stocks
                    </Button>
                    <Button
                      variant={selectedStock === 'out_of_stock' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'out_of_stock')}
                    >
                      Rupture de stock ({stockLevels.outOfStock})
                    </Button>
                    <Button
                      variant={selectedStock === 'critical' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'critical')}
                    >
                      Stock critique ({stockLevels.critical})
                    </Button>
                    <Button
                      variant={selectedStock === 'low' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'low')}
                    >
                      Stock faible ({stockLevels.low})
                    </Button>
                    <Button
                      variant={selectedStock === 'good' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'good')}
                    >
                      Bon stock ({stockLevels.good})
                    </Button>
                    <Button
                      variant={selectedStock === 'over_5' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'over_5')}
                    >
                      Plus de 5 unités
                    </Button>
                    <Button
                      variant={selectedStock === 'over_10' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'over_10')}
                    >
                      Plus de 10 unités
                    </Button>
                    <Button
                      variant={selectedStock === 'over_20' ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateFilter('stock', 'over_20')}
                    >
                      Plus de 20 unités
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filtres rapides horizontaux */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {/* Sélecteur de période rapide */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={(startDate && endDate && !isCurrentMonth()) ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                {getDateRangeLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                defaultMonth={tempDate?.from || date?.from}
                selected={tempDate}
                onSelect={handleTempDateSelect}
                numberOfMonths={1}
                className="p-3"
              />
              <div className="p-3 border-t space-y-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={applyDateFilter}
                    disabled={!tempDate?.from || !tempDate?.to}
                  >
                    Appliquer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsDatePickerOpen(false)}
                  >
                    Annuler
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={resetToCurrentMonth}
                >
                  Mois actuel
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtres rapides de stock */}
          <Button
            variant={selectedStock === 'out_of_stock' ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('stock', selectedStock === 'out_of_stock' ? 'all' : 'out_of_stock')}
          >
            Rupture
          </Button>
          <Button
            variant={selectedStock === 'critical' ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('stock', selectedStock === 'critical' ? 'all' : 'critical')}
          >
            Critique
          </Button>
          <Button
            variant={selectedStock === 'good' ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('stock', selectedStock === 'good' ? 'all' : 'good')}
          >
            Bon stock
          </Button>
        </div>
      </div>
    </div>
  );
}