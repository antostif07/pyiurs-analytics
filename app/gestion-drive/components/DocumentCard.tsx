'use client';

import { FileText, Star, MoreVertical, Edit3, Copy, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Document } from '@/app/types/documents';

interface DocCardProps {
  doc: Document;
  onPin: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function DocCard({ doc, onPin, onEdit, onCopy, onDelete }: DocCardProps) {
  return (
    <Card className="group relative bg-white dark:bg-[#202020] border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-xl p-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white">
          <FileText size={28} />
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => { e.preventDefault(); onPin(); }}
          className={`h-8 w-8 p-0 rounded-full ${doc.is_pinned ? 'text-rose-500 bg-rose-50' : 'text-gray-300 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity'}`}
        >
          <Star size={18} className={doc.is_pinned ? 'fill-current' : ''} />
        </Button>
      </div>

      <Link href={`/gestion-drive/${doc.id}`} className="flex-1 space-y-3">
        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight line-clamp-2 italic">
          {doc.name}
        </h3>
        <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-2">
          {doc.description || "Espace de travail dynamique et personnalisable."}
        </p>
      </Link>

      <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
          <Clock size={12} />
          {format(new Date(doc.updated_at), 'dd MMM', { locale: fr })}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-300 hover:text-gray-900">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-none shadow-2xl z-50">
            <DropdownMenuItem onClick={onEdit} className="rounded-xl font-bold text-xs py-2 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600">
              <Edit3 size={14} className="text-blue-500" /> Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopy} className="rounded-xl font-bold text-xs py-2 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600">
              <Copy size={14} className="text-emerald-500" /> Dupliquer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-xl font-bold text-xs py-2 gap-2 text-red-600 cursor-pointer focus:bg-red-50">
              <Trash2 size={14} /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}