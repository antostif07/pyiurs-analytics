// app/gestion-drive/[id]/components/EditorHeader.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  CloudCheck, 
  CloudUpload, 
  CloudOff, 
  Save, 
  Loader2, 
  Crown, 
  Share2, 
  MoreHorizontal,
  Check,
  X,
  Edit3,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaveStatus } from '../../[id]/hooks/useDocumentEditor';

interface EditorHeaderProps {
  document: any;
  saveStatus: SaveStatus;
  onSave: () => void;
  user: any;
  updateDocumentName: (newName: string) => Promise<void>;
}

export function EditorHeader({ 
  document, 
  saveStatus, 
  onSave, 
  user,
  updateDocumentName 
}: EditorHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(document?.name || '');
  const isOwner = user?.id === document?.created_by;

  const handleRename = async () => {
    if (tempName.trim() && tempName !== document.name) {
      await updateDocumentName(tempName);
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-14 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* BOUTON RETOUR */}
        <Link href="/gestion-drive">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100">
            <ChevronLeft size={20} />
          </Button>
        </Link>

        <div className="h-4 w-px bg-gray-200" />

        {/* TITRE & ÉDITION (NOTION STYLE) */}
        <div className="flex items-center gap-2 overflow-hidden group">
          {isEditingName ? (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
              <input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="text-sm font-bold bg-gray-100 border-none rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-rose-500/20 min-w-30"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-hidden">
              <h1 
                onClick={() => isOwner && setIsEditingName(true)}
                className={`text-sm font-bold text-gray-900 truncate tracking-tight italic uppercase ${isOwner ? 'cursor-text hover:bg-gray-50 px-1 rounded' : ''}`}
              >
                {document?.name}
              </h1>
              {isOwner && (
                <Badge className="hidden sm:flex bg-amber-50 text-amber-600 border-none text-[8px] font-black uppercase px-1.5 h-4 tracking-tighter">
                  <Crown size={8} className="mr-1" /> Owner
                </Badge>
              )}
            </div>
          )}

          {/* INDICATEUR DE STATUT DE SAUVEGARDE */}
          <div className="flex items-center gap-1.5 ml-2 min-w-25">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold italic animate-in fade-in duration-300">
                <Loader2 size={10} className="animate-spin" />
                <span className="hidden md:inline">Synchronisation...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold italic animate-in fade-in duration-300">
                <CloudCheck size={12} />
                <span className="hidden md:inline">Enregistré</span>
              </div>
            )}
            {saveStatus === 'dirty' && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold italic animate-in fade-in duration-300">
                <Clock size={12} />
                <span className="hidden md:inline">Modifications...</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold italic animate-in shake duration-300">
                <CloudOff size={12} />
                <span className="hidden md:inline">Erreur réseau</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTIONS À DROITE */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="hidden md:flex text-gray-500 font-bold text-[10px] uppercase tracking-widest h-8 gap-2 rounded-lg hover:bg-gray-50">
          <Share2 size={14} /> Partager
        </Button>
        
        <div className="h-4 w-px bg-gray-200 mx-1 hidden md:block" />

        <Button
          onClick={onSave}
          disabled={saveStatus === 'saved' || saveStatus === 'saving'}
          className={`h-8 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
            saveStatus === 'dirty' 
            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-100 scale-105' 
            : 'bg-gray-100 text-gray-400 border-transparent'
          }`}
        >
          {saveStatus === 'saving' ? (
             <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <Save size={12} className="mr-2" />
              <span>Sauver</span>
            </>
          )}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 rounded-lg">
          <MoreHorizontal size={18} />
        </Button>
      </div>
    </header>
  );
}