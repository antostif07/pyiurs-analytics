'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, Shield, ShieldCheck, Search, 
  Crown, Globe, Loader2,
} from 'lucide-react';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Types
import { DocumentPermissions, PermissionAction, PermissionRole } from '@/app/types/documents';
import { Card } from '@/components/ui/card';

interface PermissionManagerProps {
  documentId: string;
  columnId?: string;
  currentPermissions: DocumentPermissions;
  onPermissionsChange: (permissions: any) => void;
  documentOwnerId?: string;
}

export default function PermissionManager({
  columnId,
  currentPermissions,
  onPermissionsChange,
  documentOwnerId
}: PermissionManagerProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOwner = user?.id === documentOwnerId;

  // Normalisation des permissions
  const permissions = useMemo(() => {
    return currentPermissions || { read: ['all'], write: ['all'], delete: ['all'] };
  }, [currentPermissions]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('full_name');
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const hasPermission = (role: PermissionRole, action: PermissionAction): boolean => {
    if (role === documentOwnerId) return true; // Le proprio a tout
    return permissions[action]?.includes(role) || false;
  };

  const togglePermission = (role: PermissionRole, action: PermissionAction, checked: boolean) => {
    if (role === documentOwnerId) return; // Impossible de toucher au proprio

    const newPermissions = { ...permissions };
    if (!Array.isArray(newPermissions[action])) newPermissions[action] = [];

    if (checked) {
      newPermissions[action] = [...newPermissions[action], role];
    } else {
      newPermissions[action] = newPermissions[action].filter(r => r !== role);
    }
    onPermissionsChange(newPermissions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-2 font-bold text-[10px] uppercase tracking-wider h-9">
          <Users size={14} className="text-rose-500" />
          <span>Partage & Accès</span>
          {isOwner && <Crown size={12} className="text-amber-500 fill-amber-500" />}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-xl gap-0 shadow-2xl">
        <DialogHeader className="p-8 bg-gray-50/50 border-b border-gray-100">
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Shield className="text-rose-600" />
            Gestion des Accès
          </DialogTitle>
          <p className="text-xs text-gray-400 font-medium italic">
            {columnId ? "Restrictions sur cette colonne" : "Contrôle global du document"}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-8 space-y-10">
            
            {/* 1. SECTION ACCÈS GÉNÉRAL */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                <Globe size={12}/> Accès Public & Authentifié
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['read', 'write', 'delete'] as PermissionAction[]).map(action => (
                  <Card key={action} className="p-4 border-gray-100 shadow-none bg-gray-50/30 rounded-2xl space-y-4">
                    <p className="text-[10px] font-black uppercase text-gray-900">{action === 'read' ? '👀 Lecture' : action === 'write' ? '✍️ Écriture' : '🗑️ Suppression'}</p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`all-${action}`} 
                          checked={hasPermission('all', action)} 
                          onCheckedChange={(checked) => togglePermission('all', action, !!checked)}
                        />
                        <label htmlFor={`all-${action}`} className="text-xs font-bold text-gray-600 cursor-pointer">Tout le monde</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`auth-${action}`} 
                          checked={hasPermission('authenticated', action)} 
                          onCheckedChange={(checked) => togglePermission('authenticated', action, !!checked)}
                        />
                        <label htmlFor={`auth-${action}`} className="text-xs font-bold text-gray-600 cursor-pointer">Logués uniquement</label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* 2. SECTION UTILISATEURS SPÉCIFIQUES */}
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck size={12}/> Permissions par collaborateur
                </h4>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <Input 
                        placeholder="Rechercher..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 pl-9 rounded-xl border-gray-100 text-xs focus-visible:ring-rose-500/20"
                    />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="hover:bg-transparent border-b-gray-100">
                      <TableHead className="text-[9px] font-black uppercase">Collaborateur</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Lecture</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Écriture</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Suppression</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-rose-500" /></TableCell></TableRow>
                    ) : filteredUsers.map((u) => {
                        const isUserOwner = u.id === documentOwnerId;
                        return (
                          <TableRow key={u.id} className={`hover:bg-gray-50/50 border-b-gray-50 ${isUserOwner ? 'bg-amber-50/20' : ''}`}>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 rounded-xl border border-gray-100">
                                  <AvatarFallback className="bg-white text-[10px] font-black">{u.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{u.full_name} {u.id === user?.id && <span className="text-rose-500">(Moi)</span>}</p>
                                  <p className="text-[9px] text-gray-400 font-medium">{u.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            {(['read', 'write', 'delete'] as PermissionAction[]).map(action => (
                                <TableCell key={action} className="text-center">
                                    {isUserOwner ? (
                                        <div className="flex justify-center"><Crown size={14} className="text-amber-500 fill-amber-500" /></div>
                                    ) : (
                                        <Checkbox 
                                            checked={hasPermission(u.id, action)}
                                            onCheckedChange={(checked) => togglePermission(u.id, action, !!checked)}
                                            className="mx-auto rounded"
                                        />
                                    )}
                                </TableCell>
                            ))}
                          </TableRow>
                        )
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold h-10 px-6">Fermer</Button>
          <Button onClick={() => setIsOpen(false)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 px-8 font-bold shadow-lg shadow-rose-100">
             Appliquer les changements
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}