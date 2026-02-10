'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, Search, Copy, Edit3, Trash2, 
  MoreVertical, FileText,
  Clock, Loader2, ChevronLeft, Star,
} from 'lucide-react';

// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Types & Utils
import { Document } from '../types/documents';
import { duplicateDocumentProcess } from '@/lib/documentUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentDialogs } from './components/DocumentDialogs';
import { DocCard } from './components/DocumentCard';

export default function DocumentsPage() {
  const { user, profile, loading, supabase } = useAuth();
  const router = useRouter();

  // States
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals States
  const [modalMode, setModalMode] = useState<'edit' | 'duplicate' | null>(null);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({ name: '', withData: true });

  // 1. Fetching
  const fetchDocuments = async () => {
    if (!user) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .or(`created_by.eq.${user.id},default_permissions->read.cs.["all"],default_permissions->read.cs.["authenticated"],default_permissions->read.cs.["${user.id}"]`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) fetchDocuments();
  }, [user, loading]);

  // 2. Logic & Computed
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [documents, search]);

  const pinnedDocs = useMemo(() => filteredDocuments.filter(d => d.is_pinned), [filteredDocuments]);
  const otherDocs = useMemo(() => filteredDocuments.filter(d => !d.is_pinned), [filteredDocuments]);

  // --- ACTIONS ---

  const handleTogglePin = async (doc: Document) => {
    const nextValue = !doc.is_pinned;
    // Optimistic Update
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_pinned: nextValue } : d));
    
    await supabase.from('documents').update({ is_pinned: nextValue }).eq('id', doc.id);
  };

  const handleRename = async () => {
    if (!activeDoc || !formData.name) return;
    setIsProcessing(true);
    const { error } = await supabase
      .from('documents')
      .update({ name: formData.name, updated_at: new Date().toISOString() })
      .eq('id', activeDoc.id);

    if (!error) {
      setDocuments(prev => prev.map(d => d.id === activeDoc.id ? { ...d, name: formData.name } : d));
      setModalMode(null);
    }
    setIsProcessing(false);
  };

  const handleDuplicate = async () => {
    if (!activeDoc || !user) return;
    setIsProcessing(true);
    try {
      const newDoc = await duplicateDocumentProcess({
        originalDocId: activeDoc.id,
        newTitle: formData.name,
        userId: user.id,
        includeData: formData.withData,
        supabase
      });
      setDocuments([newDoc as Document, ...documents]);
      setModalMode(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce document ?")) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] transition-colors">
      <header className="sticky top-0 z-30 w-full border-b border-black/5 bg-white/80 backdrop-blur-md h-14 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}><ChevronLeft size={16} /></Button>
          <span className="font-bold text-sm tracking-tight italic">Espace de Travail / Drive</span>
        </div>
        <Badge className="bg-rose-50 text-rose-600 font-bold uppercase text-[9px]">{profile?.role}</Badge>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-2">
            <h1 className="text-6xl font-black text-gray-900 tracking-tighter italic">Drive.</h1>
            <p className="text-gray-500 font-medium">Analyses et suivis stratégiques Pyiurs.</p>
          </div>
          <Button className="bg-gray-900 hover:bg-black text-white rounded-2xl h-14 px-8 font-black shadow-xl shadow-gray-200 uppercase tracking-tighter italic transition-all active:scale-95">
            <Plus className="mr-2" size={24} /> Nouveau Document
          </Button>
        </div>

        <div className="relative max-w-md mb-12 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-rose-500 transition-colors" size={18} />
          <Input placeholder="Chercher..." className="h-12 pl-12 rounded-2xl border-transparent bg-white shadow-sm focus-visible:ring-rose-500/20 font-bold" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loadingDocs ? (
          <div className="grid grid-cols-4 gap-6 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-56 bg-gray-100 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-16">
            {pinnedDocs.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-rose-500 tracking-[0.3em] flex items-center gap-2 ml-2">
                  <Star size={14} className="fill-rose-500" /> Favoris
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pinnedDocs.map(doc => (
                    <DocCard key={doc.id} doc={doc} onPin={() => handleTogglePin(doc)} onEdit={() => { setActiveDoc(doc); setFormData({ ...formData, name: doc.name }); setModalMode('edit'); }} onCopy={() => { setActiveDoc(doc); setFormData({ name: `${doc.name} (Copie)`, withData: true }); setModalMode('duplicate'); }} onDelete={() => handleDelete(doc.id)} />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] flex items-center gap-2 ml-2 italic">Documents récents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {otherDocs.map(doc => (
                  <DocCard key={doc.id} doc={doc} onPin={() => handleTogglePin(doc)} onEdit={() => { setActiveDoc(doc); setFormData({ ...formData, name: doc.name }); setModalMode('edit'); }} onCopy={() => { setActiveDoc(doc); setFormData({ name: `${doc.name} (Copie)`, withData: true }); setModalMode('duplicate'); }} onDelete={() => handleDelete(doc.id)} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <DocumentDialogs 
        mode={modalMode} 
        onClose={() => setModalMode(null)} 
        onConfirm={modalMode === 'edit' ? handleRename : handleDuplicate}
        formData={formData}
        setFormData={setFormData}
        isProcessing={isProcessing}
      />
    </div>
  );
}