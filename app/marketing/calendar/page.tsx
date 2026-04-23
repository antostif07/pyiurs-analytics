"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Facebook, 
  MessageCircle, 
  Image as ImageIcon, 
  Calendar as CalendarIcon,
  Filter,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MarketingEventForm from "../_components/event-form";

// --- Types & Mock Data ---
type EventType = 'facebook' | 'whatsapp' | 'post';

interface MarketingEvent {
  id: string;
  title: string;
  type: EventType;
  time: string;
  status: 'scheduled' | 'published' | 'draft';
  date: Date;
}

const MOCK_EVENTS: MarketingEvent[] = [
  { id: "1", title: "Promo Robes Été", type: "facebook", time: "10:00", status: "published", date: new Date(2025, 3, 15) },
  { id: "2", title: "Relance WeShindi Beauty", type: "whatsapp", time: "14:00", status: "scheduled", date: new Date(2025, 3, 15) },
  { id: "3", title: "Shooting Photo Ngaliema", type: "post", time: "09:00", status: "draft", date: new Date(2025, 3, 16) },
  { id: "4", title: "Annonce Flash Sale", type: "facebook", time: "18:00", status: "scheduled", date: new Date(2025, 3, 18) },
  { id: "5", title: "Message Broadcast VIP", type: "whatsapp", time: "08:30", status: "scheduled", date: new Date(2025, 3, 20) },
];

export default function MarketingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<EventType | 'all'>('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Logique du calendrier
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            Calendrier Marketing
          </h1>
          <p className="text-sm text-muted-foreground italic">Planifiez vos campagnes multi-canaux.</p>
        </div>

        <div className="flex items-center gap-2 bg-card border p-1 rounded-xl shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-bold min-w-[120px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9 border-border bg-card">
            <Filter className="w-4 h-4" /> Filtres
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
            <Button size="sm" className="rounded-xl gap-2 h-9 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                <Plus className="w-4 h-4" /> Programmer
            </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] rounded-l-3xl border-l-0 shadow-2xl">
            <SheetHeader className="pb-4 border-b">
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-blue-600" /> 
                    Programmer une action
                </SheetTitle>
                <SheetDescription>
                Planifiez une publication, un boost ou une campagne WeShindi.
                </SheetDescription>
            </SheetHeader>
            
            <MarketingEventForm onSuccess={() => {
                setIsSheetOpen(false);
                // Ici, rafraîchissez vos données (ex: invalidate query)
            }} />

            </SheetContent>
            </Sheet>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {calendarDays.map((day, idx) => {
            const dayEvents = MOCK_EVENTS.filter(e => isSameDay(e.date, day));
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={idx} 
                className={cn(
                  "border-r border-b p-2 transition-colors hover:bg-muted/10 relative group",
                  !isCurrentMonth && "bg-muted/20 opacity-40"
                )}
              >
                <span className={cn(
                  "text-xs font-bold mb-2 block w-6 h-6 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) ? "bg-blue-600 text-white" : "text-muted-foreground"
                )}>
                  {format(day, "d")}
                </span>

                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {dayEvents.map(event => (
                    <EventItem key={event.id} event={event} />
                  ))}
                </div>

                {/* Quick Add Button on Hover */}
                <button className="absolute bottom-1 right-1 p-1 rounded-md bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SUMMARY SIDEBAR / LEGEND */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatusCard title="Facebook Ads" count={12} color="bg-blue-500" icon={Facebook} />
        <StatusCard title="WeShindi (WA)" count={8} color="bg-emerald-500" icon={MessageCircle} />
        <StatusCard title="Posts Organiques" count={15} color="bg-indigo-500" icon={ImageIcon} />
      </div>
    </div>
  );
}

// --- Sub-components ---

function EventItem({ event }: { event: MarketingEvent }) {
  const config = {
    facebook: { icon: Facebook, bg: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
    whatsapp: { icon: MessageCircle, bg: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
    post: { icon: ImageIcon, bg: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400" },
  };

  const { icon: Icon, bg } = config[event.type];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02]",
        bg
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{event.title}</span>
      <span className="ml-auto opacity-50 text-[8px]">{event.time}</span>
    </motion.div>
  );
}

function StatusCard({ title, count, color, icon: Icon }: any) {
  return (
    <div className="bg-card border rounded-2xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl text-white", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{title}</p>
          <p className="text-xl font-black">{count}</p>
        </div>
      </div>
      <Badge variant="outline" className="rounded-lg h-fit text-[10px]">Ce mois</Badge>
    </div>
  );
}