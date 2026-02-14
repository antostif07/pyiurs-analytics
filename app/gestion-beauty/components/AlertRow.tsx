'use client'

import { useState } from 'react';
import { updateTrackerStatus } from '../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import ProductImage from "@/app/marketing/components/ProductImage";

export default function AlertRow({ item }: { item: any }) {
    const [status, setStatus] = useState(item.status);
    const [notes, setNotes] = useState(item.manager_notes || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (newStatus?: string) => {
        setIsSaving(true);
        try {
            await updateTrackerStatus(item.hs_code, newStatus || status, notes);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <tr className={`group transition-colors ${status === 'reordered' ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
            <td className="w-20 p-2">
                <div className="h-16 w-16 rounded-xl overflow-hidden border border-gray-100 shadow-xs">
                    <ProductImage src={`https://images.pyiurs.com/images/${item.hs_code}_.jpg`} alt={item.product_name_base} />
                </div>
            </td>
            <td className="px-4 py-4">
                <p className="font-bold text-gray-900 text-xs leading-tight mb-1">{item.product_name_base}</p>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded uppercase">HS: {item.hs_code}</span>
                    {isSaving && <Loader2 size={10} className="animate-spin text-rose-500" />}
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <span className={`text-sm font-black ${item.last_total_stock < 5 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {item.last_total_stock}
                </span>
            </td>
            <td className="px-4 py-4">
                {/* SELECT DE STATUT D'ACTION */}
                <Select 
                    value={status} 
                    onValueChange={(val) => {
                        setStatus(val);
                        handleSave(val);
                    }}
                >
                    <SelectTrigger className={`h-8 text-[10px] font-black uppercase rounded-lg border-none shadow-none ${
                        status === 'reordered' ? 'bg-blue-100 text-blue-700' : 
                        status === 'out_of_stock' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low_stock" className="text-xs font-bold">STOCK BAS</SelectItem>
                        <SelectItem value="out_of_stock" className="text-xs font-bold">EN RUPTURE</SelectItem>
                        <SelectItem value="reordered" className="text-xs font-bold">COMMANDÉ 📦</SelectItem>
                        <SelectItem value="normal" className="text-xs font-bold text-emerald-600">TRAITÉ (ARCHIVER)</SelectItem>
                    </SelectContent>
                </Select>
            </td>
            <td className="px-4 py-4">
                <div className="relative group/note">
                    <MessageSquare size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/note:text-rose-500" />
                    <Input 
                        placeholder="Ajouter une note..."
                        className="h-8 pl-8 border-transparent bg-gray-50/50 text-[11px] rounded-lg focus:bg-white focus:border-gray-200"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => handleSave()}
                    />
                </div>
            </td>
            <td className="px-4 py-4 text-right">
                <Link href={`/gestion-beauty/stock/${item.hs_code}`}>
                    <button className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <ArrowRight size={18} />
                    </button>
                </Link>
            </td>
        </tr>
    );
}